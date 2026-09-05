// Ask Wikimedia Commons to render the thumbnail sizes the site uses, so first
// page loads are not waiting on thumbnail generation. Bodies are discarded.
// Usage: npx tsx pipeline/warm.ts [snapshot]   (defaults to data/latest)
import { readFileSync } from "node:fs";
import { join } from "node:path";

const UA = "vtaircrafts.in/0.1 (https://github.com/Nik-code/vtaircrafts; mailto:priyanshnikka@gmail.com)";
const SIZES = [640, 1280];
const CONCURRENCY = 4;

const dir = process.argv[2] ? join("data", "snapshots", process.argv[2]) : join("data", "latest");
const aircraft = JSON.parse(readFileSync(join(dir, "aircraft.json"), "utf8")) as Array<{ image: { src: string } | null }>;
const urls = new Set<string>();
for (const a of aircraft) {
  if (!a.image) continue;
  for (const w of SIZES) urls.add(a.image.src.replace(/\/(\d+)px-/, `/${w}px-`));
}
const queue = [...urls];
let ok = 0, fail = 0;
async function worker() {
  while (queue.length) {
    const u = queue.shift()!;
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      await r.arrayBuffer();
      if (r.ok) ok++; else fail++;
    } catch { fail++; }
    if ((ok + fail) % 50 === 0) console.log(`  ${ok + fail}/${urls.size}`);
  }
}
console.log(`warming ${urls.size} thumbnails`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`done: ok=${ok} fail=${fail}`);
