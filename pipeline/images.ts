// Resolve a Wikimedia Commons photo for each registration (exact-tail tier only).
// Results are cached on disk; fallbacks by operator/model are computed in build.ts.
// Usage: npx tsx pipeline/images.ts data/parsed/2026-08-31
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const UA = "vtaircrafts.in/0.1 (https://github.com/Nik-code/vtaircrafts; mailto:priyanshnikka@gmail.com)";
const API = "https://commons.wikimedia.org/w/api.php";
const CACHE = join("data", "cache", "commons", "exact.json");

export interface CommonsImage {
  file: string;
  src: string;          // thumbnail URL (1280px wide)
  width: number;
  height: number;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  pageUrl: string;
  date: string | null;
}
type Cache = Record<string, { checkedAt: string; image: CommonsImage | null; category: boolean }>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  throw new Error(`gave up: ${url}`);
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const BAD_FILE = /cabin|interior|cockpit|seat|galley|engine|wing\s*view|window|boarding pass|ticket|logo|map|route|menu|meal|food|crew|\.svg$|\.pdf$|\.ogv$|\.webm$/i;

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return t || null;
}

async function categoriesExist(regs: string[]): Promise<Set<string>> {
  const have = new Set<string>();
  for (const batch of chunk(regs, 50)) {
    const titles = batch.map((r) => `Category:${r} (aircraft)`).join("|");
    const j = await api({ action: "query", titles, prop: "info" });
    for (const p of j.query?.pages ?? []) {
      if (!p.missing) {
        const m = p.title.match(/Category:(VT-[A-Z]{3}) \(aircraft\)/);
        if (m) have.add(m[1]);
      }
    }
    await sleep(150);
  }
  return have;
}

async function pickFile(reg: string): Promise<string | null> {
  const j = await api({
    action: "query", list: "categorymembers", cmtitle: `Category:${reg} (aircraft)`,
    cmtype: "file", cmlimit: "50", cmsort: "timestamp", cmdir: "desc",
  });
  const files: string[] = (j.query?.categorymembers ?? []).map((m: any) => m.title as string);
  const good = files.filter((f) => !BAD_FILE.test(f));
  return good[0] ?? files[0] ?? null;
}

async function imageInfo(files: string[]): Promise<Map<string, CommonsImage>> {
  const out = new Map<string, CommonsImage>();
  for (const batch of chunk(files, 40)) {
    const j = await api({
      action: "query", titles: batch.join("|"), prop: "imageinfo",
      iiprop: "url|size|extmetadata", iiurlwidth: "1280",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|DateTimeOriginal",
    });
    for (const p of j.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const em = ii.extmetadata ?? {};
      out.set(p.title, {
        file: p.title,
        src: ii.thumburl ?? ii.url,
        width: ii.thumbwidth ?? ii.width,
        height: ii.thumbheight ?? ii.height,
        author: stripHtml(em.Artist?.value),
        license: stripHtml(em.LicenseShortName?.value),
        licenseUrl: stripHtml(em.LicenseUrl?.value),
        pageUrl: ii.descriptionurl,
        date: stripHtml(em.DateTimeOriginal?.value),
      });
    }
    await sleep(150);
  }
  return out;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: images.ts <parsed snapshot dir>");
  const regs = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const a of r.aircraft) regs.add(a.reg);
  }
  const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const maxAgeDays = Number(process.env.IMAGE_CACHE_DAYS ?? 45);
  const stale = (t: string) => (Date.now() - Date.parse(t)) / 86400000 > maxAgeDays;
  const todo = [...regs].filter((r) => !cache[r] || stale(cache[r].checkedAt));
  console.log(`regs=${regs.size} cached=${regs.size - todo.length} toCheck=${todo.length}`);

  const have = await categoriesExist(todo);
  console.log(`categories found: ${have.size}`);
  const now = new Date().toISOString();
  for (const r of todo) if (!have.has(r)) cache[r] = { checkedAt: now, image: null, category: false };

  const chosen: Array<[string, string]> = [];
  let i = 0;
  for (const r of have) {
    const f = await pickFile(r);
    if (f) chosen.push([r, f]);
    else cache[r] = { checkedAt: now, image: null, category: true };
    if (++i % 25 === 0) { console.log(`  picked ${i}/${have.size}`); writeFileSync(CACHE, JSON.stringify(cache, null, 1)); }
    await sleep(120);
  }
  const info = await imageInfo(chosen.map(([, f]) => f));
  for (const [r, f] of chosen) cache[r] = { checkedAt: now, image: info.get(f) ?? null, category: true };
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  const withImg = Object.values(cache).filter((c) => c.image).length;
  console.log(`done. exact-tail images: ${withImg}/${regs.size}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
