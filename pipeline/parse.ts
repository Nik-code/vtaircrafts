// Parse one snapshot directory of DGCA PDFs into raw JSON + a validation report.
// Usage: npx tsx pipeline/parse.ts data/raw/2026-08-31
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { extractWords } from "./lib/bbox";
import { parseScheduled } from "./parsers/scheduled";
import { parseNonScheduled } from "./parsers/nonscheduled";
import type { ParseResult } from "./lib/types";

const dir = process.argv[2];
if (!dir) throw new Error("usage: parse.ts <raw snapshot dir>");
const snapshot = basename(dir);
const outDir = join("data", "parsed", snapshot);
mkdirSync(outDir, { recursive: true });

const results: ParseResult[] = [];
const sch = join(dir, "sch-oper.pdf");
const ns = join(dir, "ns-oper.pdf");
if (existsSync(sch)) results.push(parseScheduled(extractWords(sch)));
if (existsSync(ns)) results.push(parseNonScheduled(extractWords(ns)));

for (const r of results) {
  writeFileSync(join(outDir, `${r.category}.json`), JSON.stringify(r, null, 2));
  const errors = r.issues.filter((i) => i.level === "error");
  const warns = r.issues.filter((i) => i.level === "warn");
  console.log(`\n== ${r.category}  asOn=${r.asOn}  operators=${r.operators.length}  aircraft=${r.aircraft.length}  errors=${errors.length}  warnings=${warns.length}`);
  for (const i of r.issues) console.log(`  [${i.level}]${i.page != null ? ` p${i.page}` : ""} ${i.message}`);
}
