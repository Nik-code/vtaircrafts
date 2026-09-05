// Download the current DGCA operator lists into data/raw/<as-on-date>/.
// Exits 0 and prints "unchanged" when both PDFs match the newest snapshot already on disk.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const SOURCES = [
  { file: "sch-oper.pdf", url: "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/scheduled/sch-oper.pdf" },
  { file: "ns-oper.pdf", url: "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/nonscheduled/ns-oper.pdf" },
];
const UA = "vtaircrafts.in/0.1 (https://github.com/Nik-code/vtaircrafts; mailto:priyanshnikka@gmail.com)";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function asOnDate(pdf: string): string | null {
  const text = execFileSync("pdftotext", ["-l", "1", pdf, "-"], { encoding: "utf8" });
  const m = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

async function main() {
  const tmp = join("data", "raw", ".incoming");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const rawRoot = join("data", "raw");
  const snapshots = existsSync(rawRoot) ? readdirSync(rawRoot).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() : [];
  const newest = snapshots.at(-1);

  const downloaded: Array<{ file: string; path: string; sha: string; asOn: string | null; lastModified: string | null }> = [];
  for (const s of SOURCES) {
    const res = await fetch(s.url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${s.url}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const p = join(tmp, s.file);
    writeFileSync(p, buf);
    downloaded.push({ file: s.file, path: p, sha: sha(buf), asOn: asOnDate(p), lastModified: res.headers.get("last-modified") });
  }

  const unchanged = newest && downloaded.every((d) => {
    const prev = join(rawRoot, newest, d.file);
    return existsSync(prev) && sha(readFileSync(prev)) === d.sha;
  });
  if (unchanged) {
    rmSync(tmp, { recursive: true, force: true });
    console.log(`unchanged (matches ${newest})`);
    return;
  }

  // Snapshot folder is named after the newest "updated as on" date across the files.
  const dates = downloaded.map((d) => d.asOn).filter(Boolean).sort() as string[];
  const snapshot = dates.at(-1) ?? new Date().toISOString().slice(0, 10);
  const dest = join(rawRoot, snapshot);
  mkdirSync(dest, { recursive: true });
  for (const d of downloaded) writeFileSync(join(dest, d.file), readFileSync(d.path));
  writeFileSync(join(dest, "fetch.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), files: downloaded.map(({ path: _p, ...rest }) => rest) }, null, 2));
  rmSync(tmp, { recursive: true, force: true });
  console.log(`snapshot=${snapshot}`);
  for (const d of downloaded) console.log(`  ${d.file}  asOn=${d.asOn}  sha256=${d.sha.slice(0, 12)}  last-modified=${d.lastModified}`);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `snapshot=${snapshot}\nprevious=${newest ?? ""}\n`, { flag: "a" });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
