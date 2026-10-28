// Write an nginx map that 301s lowercase or mixed-case registrations to their canonical upper-case page.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const read = (name) => (existsSync(`data/latest/${name}`) ? JSON.parse(readFileSync(`data/latest/${name}`, "utf8")) : []);
const regs = [...read("aircraft.json"), ...read("archive.json")].map((a) => a.reg);
// Also the hyphen-less spelling (/aircraft/VTDBJ), which flight trackers use.
const lines = [...new Set(regs)].flatMap((reg) => [`/aircraft/${reg.toLowerCase()} /aircraft/${reg};`, `/aircraft/${reg.replace("-", "").toLowerCase()} /aircraft/${reg};`]);
mkdirSync("build", { recursive: true });
writeFileSync("build/redirects.map", `${lines.join("\n")}\n`);
console.log(`wrote ${lines.length} registration redirects -> build/redirects.map`);
