// Smoke-test the nginx config against a running server (default http://127.0.0.1:8080) that serves out/
// with build/redirects.map, the way the Docker image does. Catches redirect loops, broken try_files and
// missing cache headers before they reach Googlebot. Run after `npm run build`.
import { readFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const ORIGIN = "https://vtaircrafts.in";
const paths = [...readFileSync("out/sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(ORIGIN.length) || "/");
const regs = paths.filter((p) => p.startsWith("/aircraft/")).map((p) => p.slice("/aircraft/".length));
const problems = [];
let checked = 0;

async function expect(path, want) {
  const res = await fetch(base + path, { redirect: "manual" });
  checked++;
  const got = { status: res.status, location: res.headers.get("location"), cache: res.headers.get("cache-control") ?? "" };
  await res.arrayBuffer();
  if (got.status !== want.status) problems.push(`${path}: ${got.status}, want ${want.status}${got.location ? ` (Location ${got.location})` : ""}`);
  else if (want.location && got.location !== want.location) problems.push(`${path}: Location ${got.location}, want ${want.location}`);
  else if (want.cache && !got.cache.includes(want.cache)) problems.push(`${path}: Cache-Control "${got.cache}", want ${want.cache}`);
}

async function run(jobs, width = 32) {
  const queue = [...jobs];
  await Promise.all(Array.from({ length: width }, async () => { while (queue.length) await queue.shift()(); }));
}

// Every sitemap URL answers 200 itself, never a redirect (a self-redirect here is the 25 Oct 2026 loop).
const jobs = paths.map((p) => () => expect(p, { status: 200, cache: "s-maxage" }));
// Other spellings of a registration 301 to the canonical page with a relative Location.
const step = Math.max(1, Math.floor(regs.length / 300));
for (const reg of regs.filter((_, i) => i % step === 0)) {
  const target = `/aircraft/${reg}`;
  jobs.push(() => expect(`/aircraft/${reg.toLowerCase()}`, { status: 301, location: target }));
  jobs.push(() => expect(`/aircraft/${reg.replace("-", "")}`, { status: 301, location: target }));
  jobs.push(() => expect(`/aircraft/${reg.replace("-", "").toLowerCase()}`, { status: 301, location: target }));
}
jobs.push(() => expect("/aircraft/VT-ZZZZ9", { status: 404 }));
jobs.push(() => expect("/robots.txt", { status: 200 }));
jobs.push(() => expect(`/aircraft/${regs[0]}.txt`, { status: 200 }));

await run(jobs);
console.log(`nginx smoke: ${checked} requests against ${base}`);
if (problems.length) {
  // Wrong status codes and redirects first; missing cache headers matter less.
  problems.sort((a, b) => Number(a.includes("Cache-Control")) - Number(b.includes("Cache-Control")));
  console.error(problems.slice(0, 50).join("\n"));
  console.error(`${problems.length} problems`);
  process.exit(1);
}
