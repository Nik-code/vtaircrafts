// What photograph did every aircraft get, and why.
//
// Usage: npx tsx pipeline/debug/imagesReport.ts [VT-ANI VT-ANA ...] [--worst 30] [--snapshot 2026-08-31]
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assignImagesDetailed, type ImageAssignable, type ImageCache } from "../lib/assignImages";
import type { CandidateCache, TypeCandidateCache } from "../images";

interface Row extends ImageAssignable {
  operator: string;
}

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const worstCount = Number(flag("worst", "30"));
const snapshot = flag("snapshot", "");
const regs = args.filter((a) => /^VT-/i.test(a)).map((a) => a.toUpperCase());

const dir = snapshot ? join("data", "snapshots", snapshot) : join("data", "latest");
const cacheDir = join("data", "cache", "commons");
const read = <T,>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;

const aircraft = read<Row[]>(join(dir, "aircraft.json"), []);
const exact = read<ImageCache>(join(cacheDir, "exact.json"), {});
const candidates = read<CandidateCache>(join(cacheDir, "candidates.json"), {});
const types = read<TypeCandidateCache>(join(cacheDir, "types.json"), {});

const { counts, picks } = assignImagesDetailed(aircraft, exact, { candidates, types });

const total = aircraft.length;
console.log(`aircraft: ${total}`);
for (const [tier, n] of Object.entries(counts)) {
  console.log(`  ${tier.padEnd(13)} ${String(n).padStart(5)}  ${((n / total) * 100).toFixed(1)}%`);
}
const withPhoto = total - counts.none;
console.log(`  coverage      ${withPhoto}/${total} (${((withPhoto / total) * 100).toFixed(1)}%), null: ${counts.none}`);

const catCount = Object.values(candidates).filter((c) => c.candidates.length).length;
const typeCount = Object.values(types).filter((t) => t.candidates.length).length;
console.log(`caches: ${catCount} registrations with candidates, ${typeCount} types with candidates`);
const noType = [...new Set(aircraft.map((a) => a.type.name))].filter((t) => !(types[t]?.candidates.length));
if (noType.length) console.log(`types with no type-world photo: ${noType.join(", ")}`);

const distinct = new Set([...picks.values()].map((p) => p.file));
console.log(`distinct photographs in use: ${distinct.size}`);

console.log(`\nlowest-scoring ${worstCount} picks`);
const worst = [...picks.values()].sort((a, b) => a.adjusted - b.adjusted).slice(0, worstCount);
for (const p of worst) {
  const a = aircraft.find((x) => x.reg === p.reg)!;
  console.log(
    `  ${p.reg}  ${String(p.score).padStart(4)} (${String(p.adjusted).padStart(4)} adj)  ${p.tier.padEnd(13)}` +
      ` ${(a.operator ?? "").slice(0, 22).padEnd(22)} ${a.type.name.slice(0, 26).padEnd(26)}` +
      ` [${p.flags.join(",")}] ${p.file.replace(/^File:/, "")}`,
  );
}

for (const reg of regs) {
  const a = aircraft.find((x) => x.reg === reg);
  console.log(`\n=== ${reg}`);
  if (!a) {
    console.log("  not in the fleet");
    continue;
  }
  console.log(`  ${a.operator} / ${a.type.name} (${a.model})`);
  const p = picks.get(reg);
  console.log(
    p
      ? `  chosen: [${p.tier}${p.ofReg && p.ofReg !== reg ? ` of ${p.ofReg}` : ""}] score=${p.score} adj=${p.adjusted}` +
          ` flags=[${p.flags.join(",")}]\n          ${p.file}\n          ${a.image?.pageUrl ?? ""}`
      : "  no photograph",
  );
  const entry = candidates[reg];
  console.log(`  category: ${entry?.category ?? "none on Commons"}`);
  for (const c of entry?.candidates ?? []) {
    console.log(`    ${String(c.score).padStart(4)} [${c.flags.join(",") || "-"}] ${c.width}x${c.height} ${c.date ?? "?"} ${c.file.replace(/^File:/, "")}`);
  }
  const world = types[a.type.name];
  console.log(`  type-world: ${world?.category ?? "unresolved"}`);
  for (const c of world?.candidates ?? []) {
    console.log(`    ${String(c.score).padStart(4)} [${c.flags.join(",") || "-"}] ${c.width}x${c.height} ${c.date ?? "?"} ${c.file.replace(/^File:/, "")}`);
  }
}
