// Check the static export the way a crawler sees it: every sitemap URL has a page, that page is
// canonical to itself, is indexable, and has its own title. Run after `npm run build`.
import { existsSync, readFileSync } from "node:fs";

const ORIGIN = "https://vtaircrafts.in";
const xml = readFileSync("out/sitemap.xml", "utf8");
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const problems = [];
const titles = new Map();

for (const url of urls) {
  if (!url.startsWith(ORIGIN)) {
    problems.push(`${url}: not on ${ORIGIN}`);
    continue;
  }
  const path = url.slice(ORIGIN.length) || "/";
  const file = path === "/" ? "out/index.html" : [`out${path}.html`, `out${path}/index.html`].find(existsSync);
  if (!file || !existsSync(file)) {
    problems.push(`${path}: no page in out/`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== url && !(path === "/" && canonical === ORIGIN)) problems.push(`${path}: canonical is ${canonical ?? "missing"}`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) problems.push(`${path}: noindex but listed in the sitemap`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  if (!title) problems.push(`${path}: no title`);
  else titles.set(title, [...(titles.get(title) ?? []), path]);
}

for (const [title, paths] of titles) if (paths.length > 1) problems.push(`title "${title}" on ${paths.join(", ")}`);

const robots = readFileSync("out/robots.txt", "utf8");
if (/^Disallow:\s*\/\s*$/im.test(robots)) problems.push("robots.txt disallows the whole site");

console.log(`checked ${urls.length} sitemap URLs`);
if (problems.length) {
  console.error(problems.slice(0, 50).join("\n"));
  console.error(`${problems.length} SEO problems`);
  process.exit(1);
}
