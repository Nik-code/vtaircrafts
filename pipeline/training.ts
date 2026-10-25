// Fetch and parse DGCA's list of approved Flying Training Organisations into
// data/latest/training.json.
//
//   npx tsx pipeline/training.ts            # download, store if new, parse
//   npx tsx pipeline/training.ts --no-fetch # re-parse the newest stored PDF
//
// The PDF is kept as data/raw/training/<as-on date>/flyclub.pdf. A download whose sha256
// matches a stored copy is not written again, so the output only changes when DGCA
// publishes a new list. Runs every month in .github/workflows/monthly.yml, independently of
// the operator lists.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractWords } from "./lib/bbox";
import { parseAsOn } from "./lib/text";
import { getBuffer, isPdf } from "./history/http";
import { parseTraining, type Fto, type TrainingIssue } from "./parsers/training";

const SOURCE_URL = "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/personal/training/pilot/flrTrainOrgs/flyclub.pdf";
const FILE = "flyclub.pdf";
const RAW_ROOT = join("data", "raw", "training");
const OUT = join("data", "latest", "training.json");

interface Stored {
  path: string;
  sha256: string;
}

export interface TrainingFile {
  asOn: string | null;
  source: { url: string; file: string; sha256: string };
  ftos: Fto[];
  issues: TrainingIssue[];
}

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** Stored copies, oldest first (folders are ISO dates). */
function storedCopies(): Stored[] {
  if (!existsSync(RAW_ROOT)) return [];
  return readdirSync(RAW_ROOT)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && existsSync(join(RAW_ROOT, d, FILE)))
    .sort()
    .map((d) => {
      const path = join(RAW_ROOT, d, FILE);
      return { path, sha256: sha(readFileSync(path)) };
    });
}

function asOnOf(pdf: string): string | null {
  return parseAsOn(execFileSync("pdftotext", ["-l", "1", pdf, "-"], { encoding: "utf8" }));
}

async function download(): Promise<Stored> {
  const buf = await getBuffer(SOURCE_URL, { delay: 0 });
  if (!buf || !isPdf(buf)) throw new Error(`${SOURCE_URL}: no PDF returned`);
  const hash = sha(buf);
  const known = storedCopies().find((s) => s.sha256 === hash);
  if (known) {
    console.log(`unchanged (matches ${known.path})`);
    return known;
  }
  // Read the "As on" date from a scratch copy, then file the PDF under it.
  const tmp = join(RAW_ROOT, ".incoming.pdf");
  mkdirSync(RAW_ROOT, { recursive: true });
  writeFileSync(tmp, buf);
  let asOn = asOnOf(tmp);
  if (!asOn) {
    asOn = new Date().toISOString().slice(0, 10);
    console.warn(`  ! no "As on" date in the PDF, filing it under today (${asOn})`);
  }
  const dir = join(RAW_ROOT, asOn);
  const path = join(dir, FILE);
  if (existsSync(path)) console.warn(`  ! ${path} exists with a different sha256; DGCA re-issued the list without a new date. Replacing it.`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, buf);
  rmSync(tmp, { force: true });
  console.log(`stored ${path}  sha256=${hash.slice(0, 12)}`);
  return { path, sha256: hash };
}

function loadFleetRegs(): Set<string> {
  const p = join("data", "latest", "aircraft.json");
  if (!existsSync(p)) return new Set();
  const list = JSON.parse(readFileSync(p, "utf8")) as Array<{ reg: string }>;
  return new Set(list.map((a) => a.reg));
}

async function main() {
  const fetch = !process.argv.includes("--no-fetch");
  const pdf = fetch ? await download() : storedCopies().at(-1);
  if (!pdf) throw new Error(`nothing stored under ${RAW_ROOT}; run without --no-fetch first`);

  const parsed = parseTraining(extractWords(pdf.path));
  const out: TrainingFile = {
    asOn: parsed.asOn,
    source: { url: SOURCE_URL, file: pdf.path, sha256: pdf.sha256 },
    ftos: parsed.ftos,
    issues: parsed.issues,
  };
  mkdirSync(join("data", "latest"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 1));

  const aircraft = out.ftos.flatMap((f) => f.aircraft);
  const regs = new Set(aircraft.map((a) => a.reg));
  const fleet = loadFleetRegs();
  const inFleet = [...regs].filter((r) => fleet.has(r)).length;
  // "Unknown" means no classifyModel rule matched; a matched family can still lack an ICAO code.
  const unknown = aircraft.filter((a) => a.type.family === "Other").length;
  const noIcao = aircraft.filter((a) => !a.type.icao).length;
  const errors = out.issues.filter((i) => i.level === "error").length;

  console.log(`\n== training  asOn=${out.asOn}  -> ${OUT}`);
  console.log(`  FTOs:                  ${out.ftos.length}`);
  console.log(`  aircraft:              ${aircraft.length} entries, ${regs.size} unique registrations`);
  console.log(`  in data/latest fleet:  ${inFleet} of ${regs.size}`);
  console.log(`  unknown type:          ${unknown} of ${aircraft.length} (${noIcao} without an ICAO code)`);
  console.log(`  issues:                ${out.issues.length} (${errors} errors)`);
  if (parsed.unnormalised.length) {
    console.log(`\n  registrations that do not normalise (${parsed.unnormalised.length}):`);
    for (const u of parsed.unnormalised) console.log(`    ${u.ftoId}: "${u.text}"`);
  }
  for (const i of out.issues) console.log(`  [${i.level}]${i.page != null ? ` p${i.page}` : ""}${i.ftoId ? ` ${i.ftoId}:` : ""} ${i.message}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
