// Ask Wikimedia Commons to render the thumbnail sizes the site uses, so first
// page loads are not waiting on thumbnail generation. Bodies are discarded.
//
// The set of photographs is recomputed with assignImages() from the Commons
// candidate caches, so this warms exactly what the next build will show. When the
// caches are missing it falls back to the images already in the snapshot.
//
// URLs go through the site's own thumb() helper: Wikimedia only renders a fixed set
// of thumbnail widths and returns 400 for the rest.
//
// Usage: npx tsx pipeline/warm.ts [snapshot]   (defaults to data/latest)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assignImagesDetailed, type ImageAssignable, type ImageCache } from "./lib/assignImages";
// The site's own URL builder, so we warm exactly the URLs a browser will request.
import { thumb } from "../src/lib/format";

const UA = "vtaircrafts.in/0.1 (https://github.com/Nik-code/vtaircrafts; mailto:priyanshnikka@gmail.com)";
/**
 * The widths the site's components ask for (Plate width props: 960 in the fleet
 * grid, 1280 everywhere else). thumb() snaps them to the sizes Wikimedia is willing
 * to render - since 2025 it answers 400 for anything off that list, which is why 640
 * is not warmed: the site never requests it and upload.wikimedia.org would refuse.
 */
const SIZES = [960, 1280];
const CONCURRENCY = 4;

const dir = process.argv[2] ? join("data", "snapshots", process.argv[2]) : join("data", "latest");
const aircraft = JSON.parse(readFileSync(join(dir, "aircraft.json"), "utf8")) as ImageAssignable[];

const cachePath = join("data", "cache", "commons", "exact.json");
const cache: ImageCache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
const { counts } = assignImagesDetailed(aircraft, cache);
console.log(`assignment: ${JSON.stringify(counts)}`);

const urls = new Set<string>();
for (const a of aircraft) {
  if (!a.image) continue;
  for (const w of SIZES) urls.add(thumb(a.image.src, w));
}

const queue = [...urls];
let ok = 0;
let fail = 0;
async function worker() {
  while (queue.length) {
    const u = queue.shift()!;
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      await r.arrayBuffer();
      if (r.ok) ok++;
      else fail++;
    } catch {
      fail++;
    }
    if ((ok + fail) % 50 === 0) console.log(`  ${ok + fail}/${urls.size}`);
  }
}

// No top-level await: tsx compiles this package (no "type": "module") to CJS.
async function main() {
  console.log(`warming ${urls.size} thumbnails`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`done: ok=${ok} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
