// Resolve Wikimedia Commons photographs for the fleet.
//
// Two passes, both cached on disk:
//   1. exact tail  - every registration that has a "Category:VT-XXX (aircraft)":
//                    list its files, score them, keep the best five.
//   2. type-world  - every distinct type.name: find the Commons category for the
//                    type (curated map first, then search), score its files, keep
//                    the best five. Used for types no Indian tail photographs.
//
// Caches (45-day freshness):
//   data/cache/commons/candidates.json  per registration: scored candidates
//   data/cache/commons/types.json       per type.name:    scored candidates
//   data/cache/commons/exact.json       per registration: the single best image
//                                       (legacy shape, kept so an older build works)
//
// Usage: npx tsx pipeline/images.ts data/parsed/2026-08-31 [--skip-regs] [--skip-types]
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeType, classifyModel, identifyOperator } from "./lib/normalize";
import { TYPE_CATEGORIES, searchTokens, type TypeCategory } from "./lib/typeCategories";
import type { ParseResult } from "./lib/types";

const UA = "vtaircrafts.in/0.1 (https://github.com/Nik-code/vtaircrafts; mailto:priyanshnikka@gmail.com)";
const API = "https://commons.wikimedia.org/w/api.php";
const CACHE_DIR = join("data", "cache", "commons");
const EXACT_CACHE = join(CACHE_DIR, "exact.json");
const CANDIDATE_CACHE = join(CACHE_DIR, "candidates.json");
const TYPE_CACHE = join(CACHE_DIR, "types.json");

const CONCURRENCY = 4;
const MIN_INTERVAL_MS = 130; // Wikimedia etiquette: ~7.7 req/s across all workers
const MAX_FILES_PER_REG = 30;
const MAX_FILES_PER_TYPE = 60;
const TITLES_PER_BATCH = 40;
const KEEP_CANDIDATES = 5;

export interface CommonsImage {
  file: string;
  src: string; // thumbnail URL (1280px wide)
  width: number;
  height: number;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  pageUrl: string;
  date: string | null;
}

/** A scored photograph. `flags` explains the score; see scoreFile(). */
export interface Candidate extends CommonsImage {
  score: number;
  flags: string[];
}

export interface CandidateEntry {
  checkedAt: string;
  category: string | null;
  candidates: Candidate[];
}

/** data/cache/commons/candidates.json - keyed by registration. */
export type CandidateCache = Record<string, CandidateEntry>;
/** data/cache/commons/types.json - keyed by type.name. */
export type TypeCandidateCache = Record<string, CandidateEntry>;

/** data/cache/commons/exact.json - the legacy single-image cache. */
type ExactCache = Record<string, { checkedAt: string; image: CommonsImage | null; category: boolean }>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

// ---------------------------------------------------------------------------
// HTTP: one global pacer so four workers still respect MIN_INTERVAL_MS.
// ---------------------------------------------------------------------------

let pacer: Promise<void> = Promise.resolve();
let lastStart = 0;
function slot(): Promise<void> {
  pacer = pacer.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastStart);
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
  });
  return pacer;
}

let requests = 0;
async function api(params: Record<string, string>): Promise<Json> {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    await slot();
    requests++;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
        lastError = `${res.status}`;
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      lastError = String(e);
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error(`gave up after 5 attempts (${lastError}): ${url}`);
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function pool<T>(items: T[], workers: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  const run = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, run));
}

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return t || null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
//
// A candidate starts at BASE = 40 and is adjusted. Anything below 0 is refused by
// the assigner; the "type" tier (same type, another Indian operator) additionally
// requires >= 40, i.e. no worse than a plain, unremarkable side-on photograph.
//
//   hard reject   non-image / svg / width < 800 / aspect outside 1.15-2.4,
//                 or cabin, cockpit, seats, engine detail, boarding, models,
//                 drawings, logos, maps, timetables ... (BAD_SUBJECT)
//   -40  group    the file sits in more than one "<reg> (aircraft)" category, or
//                 names two or more registrations in its title: a ramp scene, not
//                 a portrait of this tail
//   -30  other-op an airline other than this aircraft's operator is named in the
//                 title, description or categories: wrong livery
//   -20  plural   "Planes of …", "fleet of …": several aircraft in one frame
//   -25  night    night / dusk / dawn / sunset / sunrise
//   +20  view     in flight, landing, takeoff, approach, taxiing (the good shots)
//   +25  assessed Commons Featured pictures / Quality images / Valued images
//   +10  big      width >= 2000       (+5 for 1200-1999)
//   +10  recent   taken within 5 years (current livery)
//   -15  old      taken more than 12 years ago (Air India and IndiGo rebranded)
//   +15  livery   operator with a known rebrand, shot after it (Air India >= 2024,
//                 or "new livery" in the text)
//   -20  ex-livery same operator, "old livery" / "Maharaja livery"
//   +15  variant  type-world only: file names the exact variant of a family category
//   +5   named    the registration itself appears in the title or description

const BASE_SCORE = 40;

const W = {
  group: -40,
  plural: -20,
  otherOperator: -30,
  night: -25,
  view: 20,
  assessed: 25,
  wide: 10,
  medium: 5,
  recent: 10,
  old: -15,
  newLivery: 15,
  oldLivery: -20,
  variant: 15,
  named: 5,
} as const;

/** Subjects we never want. Applied to the file name and its categories. */
const BAD_SUBJECT =
  /\b(cabin|interior|cockpit|flight deck|seats?|seating|galley|lavator|engine detail|engine close|engine run|engine view|wing view|window view|winglet|boarding pass|boarding gate|boarding|ticket|menus?|meals?|catering|crew|model aircraft|scale model|livery drawing|drawing|livery design|logos?|maps?|timetable|safety card|landing gear|nose gear|patch|stamp|poster|advertisement|accidents?|crash(ed|es)?|incidents?|tail ?strike|cctv|wreckage|wreck|scrapped|derelict|damaged|burning|on fire|silhouette|schematic)\b/i;
/** Unmistakable substrings, matched without word boundaries (file names run words together). */
const BAD_TOKEN = /tailstrike|cctv|crashsite|wreckage|cabininterior|seatmap|closeup/i;
/** People are the subject, the aeroplane is the backdrop. */
const BAD_PEOPLE =
  /\b(prime minister|president|vice[- ]president|chancellor|ambassador|delegation|his majesty|her majesty|royal visit|state visit|meets?|greets?|speaks?|press conference|interview|portrait|selfie|casualty|funeral|handover ceremony|flir ball|close[- ]up)\b/i;
/**
 * The same idea for free-text descriptions, minus words that legitimately appear
 * in a caption about the whole aeroplane ("seats 180", "boarding at gate 12",
 * "two crew", "on the map").
 */
const BAD_SUBJECT_DESC =
  /\b(cabin|interior|cockpit|flight deck|galley|lavator|engine detail|engine close|wing view|window view|boarding pass|ticket|menus?|meals?|model aircraft|scale model|livery drawing|route map|timetable|safety card)\b/i;
const NIGHT = /\b(night|nocturnal|dusk|dawn|sunset|sunrise|evening|twilight|floodlit)\b/i;
const GOOD_VIEW =
  /\b(in[ -]?flight|inflight|airborne|landing|touchdown|take[ -]?off|takeoff|taking off|departing|departure roll|on approach|short final|final approach|approach|climb|climbing|rotating|rotation|taxi|taxiing|taxying|taxying out|lining up)\b/i;
const ASSESSED = /\b(featured pictures|quality images|valued images)\b/i;
/** Plural subject in the file name: "Planes of …", "fleet of …" - several aircraft in one frame. */
const PLURAL_SUBJECT = /\b(planes|airplanes|aeroplanes|aircrafts|helicopters|jets|fleet|line-?up)\b/i;
const REG_CATEGORY = /^([A-Z0-9]{1,2}-[A-Z0-9]{2,5}|N\d{1,5}[A-Z]{0,2}) \(/;
const REG_IN_TITLE = /\b([A-Z]{1,2})-([A-Z0-9]{3,5})\b/g;
/**
 * Two-letter prefixes that look like a registration but are usually a type
 * designation ("EC-135", "AS-350"). Suppressing them costs a little recall on
 * group shots involving Spanish/Thai/Swedish tails and avoids penalising a
 * perfectly good photograph whose file name spells out the type twice.
 */
const TYPE_PREFIXES = new Set([
  "AS", "EC", "PC", "MD", "RJ", "CL", "AN", "IL", "TU", "MI", "KA", "DO", "PA", "CH", "UH", "SA", "AB", "AW",
  "SE", "BN", "GA", "TB", "HS", "EM", "AT", "BE",
]);

const WORLD_AIRLINES = [
  "British Airways", "Lufthansa", "Emirates", "Qatar Airways", "Etihad", "Singapore Airlines", "Cathay Pacific",
  "Cathay Dragon", "easyJet", "Ryanair", "Wizz Air", "Norse Atlantic", "Virgin Atlantic", "Air France", "KLM",
  "Turkish Airlines", "Swiss International", "Austrian Airlines", "Brussels Airlines", "Iberia", "Vueling",
  "TAP Air Portugal", "Finnair", "SAS Scandinavian", "Norwegian Air", "Jet2", "TUI Airways", "Condor",
  "Aeroflot", "S7 Airlines", "Pegasus Airlines", "SunExpress", "Air Arabia", "Jazeera Airways", "flydubai",
  "Kuwait Airways", "Oman Air", "Gulf Air", "Saudia", "Royal Jordanian", "Middle East Airlines", "EgyptAir",
  "Ethiopian Airlines", "Kenya Airways", "South African Airways", "American Airlines", "Delta Air Lines",
  "United Airlines", "Southwest Airlines", "JetBlue", "Alaska Airlines", "Spirit Airlines", "Frontier Airlines",
  "Air Canada", "WestJet", "Aeromexico", "Copa Airlines", "Avianca", "LATAM", "Azul", "Gol Linhas",
  "Air China", "China Eastern", "China Southern", "Hainan Airlines", "Xiamen Air", "Shenzhen Airlines",
  "Juneyao", "Spring Airlines", "China Airlines", "EVA Air", "Korean Air", "Asiana", "Japan Airlines",
  "All Nippon Airways", "Thai Airways", "Bangkok Airways", "Malaysia Airlines", "AirAsia", "Batik Air",
  "Lion Air", "Garuda Indonesia", "Scoot", "Jetstar", "Qantas", "Air New Zealand", "Philippine Airlines",
  "Cebu Pacific", "Vietnam Airlines", "VietJet", "Myanmar Airways", "SriLankan Airlines", "Biman Bangladesh",
  "US-Bangla", "Nepal Airlines", "Buddha Air", "Yeti Airlines", "Himalaya Airlines", "Drukair",
  "Pakistan International", "Iran Air", "Mahan Air", "Uzbekistan Airways", "Air Astana", "Azerbaijan Airlines",
  // Indian carriers that no longer exist or have merged: their liveries are wrong for a current tail.
  "Jet Airways", "JetKonnect", "Kingfisher Airlines", "Go First", "GoAir", "Air Deccan", "Air Sahara",
  "Vistara", "AirAsia India", "Zoom Air", "Trujet", "Paramount Airways", "MDLR", "Air Costa", "Air Pegasus",
  "Air Odisha", "Air Carnival", "Indian Airlines", "Air India Charters", "Deccan 360", "Air Heritage",
];

/** Operator brand names to watch for, loaded once from the built operators.json. */
function loadOperatorNames(): string[] {
  const names = new Set<string>(WORLD_AIRLINES);
  const file = join("data", "latest", "operators.json");
  if (existsSync(file)) {
    try {
      const ops = JSON.parse(readFileSync(file, "utf8")) as Array<{ name: string }>;
      const singles = new Set(["indigo", "spicejet", "vistara", "quikjet", "indocopters", "flybig", "akasa"]);
      for (const o of ops) {
        const n = o.name.trim();
        if (!n) continue;
        const words = n.split(/\s+/).length;
        if (singles.has(n.toLowerCase()) || (words >= 2 && n.length >= 8)) names.add(n);
      }
    } catch {
      /* fall back to the static list */
    }
  }
  return [...names];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const OPERATOR_PATTERNS: Array<{ name: string; re: RegExp }> = loadOperatorNames().map((name) => ({
  name,
  re: new RegExp(`(?:^|[^A-Za-z])${escapeRe(name).replace(/\s+/g, "[\\s-]+")}(?![A-Za-z])`, "i"),
}));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Operators whose current livery postdates a rebrand. */
const REBRANDS: Array<{ match: RegExp; since: number }> = [
  { match: /^air india$/i, since: 2024 },
  { match: /^air india express$/i, since: 2024 },
];

export interface FileMeta {
  title: string;
  mime: string;
  width: number;
  height: number;
  src: string;
  pageUrl: string;
  categories: string[];
  description: string | null;
  date: string | null;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
}

export interface ScoreContext {
  /** Registration the file is being scored for; enables the group-shot title check. */
  reg?: string | null;
  /** Operator of that registration; any other airline named in the file costs -30. */
  operator?: string | null;
  /** Type-world only: exact-variant bonus and wrong-variant rejection. */
  type?: TypeCategory | null;
}

function yearOf(date: string | null): number | null {
  if (!date) return null;
  const m = date.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  return m ? Number(m[1]) : null;
}

/**
 * Score one file. Returns null when the file is unusable (see BAD_SUBJECT and the
 * dimension rules); otherwise a score around BASE_SCORE with the reasons in `flags`.
 */
export function scoreFile(m: FileMeta, ctx: ScoreContext = {}): { score: number; flags: string[] } | null {
  if (!m.mime.startsWith("image/") || /svg|tiff/i.test(m.mime)) return null;
  if (/\.(svg|pdf|ogv|webm|gif|tif|tiff)$/i.test(m.title)) return null;
  if (!m.width || !m.height || m.width < 800) return null;
  const ratio = m.width / m.height;
  if (ratio < 1.15 || ratio > 2.4) return null;

  const catText = m.categories.join(" | ");
  const text = `${m.title} ${catText} ${m.description ?? ""}`;
  const titleAndCats = `${m.title} ${catText}`;
  if (BAD_SUBJECT.test(titleAndCats) || BAD_TOKEN.test(m.title) || BAD_PEOPLE.test(titleAndCats)) return null;
  if (m.description && BAD_SUBJECT_DESC.test(m.description)) return null;
  if (ctx.type?.deny?.test(text)) return null;

  let score = BASE_SCORE;
  const flags: string[] = [];
  const add = (delta: number, flag: string) => {
    score += delta;
    flags.push(flag);
  };

  // Group shots: several tails in one frame.
  const regCats = new Set<string>();
  for (const c of m.categories) {
    const hit = c.match(REG_CATEGORY);
    if (hit) regCats.add(hit[1]);
  }
  let titleRegs = 0;
  const seen = new Set<string>();
  for (const hit of m.title.matchAll(REG_IN_TITLE)) {
    if (TYPE_PREFIXES.has(hit[1].toUpperCase())) continue;
    if (seen.has(hit[0])) continue;
    seen.add(hit[0]);
    titleRegs++;
  }
  if (regCats.size > 1 || titleRegs > 1) add(W.group, `group(${Math.max(regCats.size, titleRegs)})`);

  // Wrong livery: another airline named anywhere in the file's metadata.
  if (ctx.operator) {
    const own = norm(ctx.operator);
    for (const op of OPERATOR_PATTERNS) {
      const other = norm(op.name);
      if (other.includes(own) || own.includes(other)) continue;
      if (op.re.test(text)) {
        add(W.otherOperator, `other-op:${op.name}`);
        break;
      }
    }
  }

  // Title only: category names like "Helicopters in Italy" are not group shots.
  if (PLURAL_SUBJECT.test(m.title)) add(W.plural, "plural");
  if (NIGHT.test(text)) add(W.night, "night");
  if (GOOD_VIEW.test(text)) add(W.view, "view");
  if (ASSESSED.test(catText)) add(W.assessed, "assessed");
  if (m.width >= 2000) add(W.wide, "big");
  else if (m.width >= 1200) add(W.medium, "medium");

  const year = yearOf(m.date);
  const thisYear = new Date().getFullYear();
  if (year !== null) {
    const age = thisYear - year;
    if (age <= 5) add(W.recent, `recent(${year})`);
    else if (age > 12) add(W.old, `old(${year})`);
  }

  if (ctx.operator) {
    const rebrand = REBRANDS.find((r) => r.match.test(ctx.operator!.trim()));
    if (rebrand) {
      if (/\bnew livery\b/i.test(text) || (year !== null && year >= rebrand.since)) add(W.newLivery, "new-livery");
      if (/\bold livery\b|maharaja/i.test(text)) add(W.oldLivery, "old-livery");
    }
  }

  if (ctx.type?.prefer?.test(text)) add(W.variant, "variant");
  if (ctx.reg && new RegExp(`\\b${escapeRe(ctx.reg)}\\b`, "i").test(`${m.title} ${m.description ?? ""}`)) {
    add(W.named, "named");
  }

  return { score, flags };
}

function toCandidate(m: FileMeta, scored: { score: number; flags: string[] }): Candidate {
  return {
    file: m.title,
    src: m.src,
    width: m.width,
    height: m.height,
    author: m.author,
    license: m.license,
    licenseUrl: m.licenseUrl,
    pageUrl: m.pageUrl,
    date: m.date,
    score: scored.score,
    flags: scored.flags,
  };
}

// ---------------------------------------------------------------------------
// Commons queries
// ---------------------------------------------------------------------------

async function categoriesExist(titles: string[]): Promise<Set<string>> {
  const have = new Set<string>();
  for (const batch of chunk(titles, 50)) {
    const j = await api({ action: "query", titles: batch.join("|"), prop: "info" });
    for (const p of j.query?.pages ?? []) if (!p.missing && !p.invalid) have.add(p.title);
  }
  return have;
}

/**
 * Newest files of a category. cmtype is ignored by the API when cmsort=timestamp,
 * so ask for more members than we need and keep the ones in the File namespace.
 */
async function listFiles(category: string, limit: number): Promise<string[]> {
  const j = await api({
    action: "query",
    list: "categorymembers",
    cmtitle: category,
    cmtype: "file",
    cmlimit: String(Math.min(limit * 3 + 10, 500)),
    cmsort: "timestamp",
    cmdir: "desc",
  });
  return (j.query?.categorymembers ?? [])
    .filter((m: { ns?: number; title: string }) => m.ns === 6 || m.title.startsWith("File:"))
    .map((m: { title: string }) => m.title)
    .slice(0, limit);
}

async function listSubcategories(category: string, limit: number): Promise<string[]> {
  const j = await api({
    action: "query",
    list: "categorymembers",
    cmtitle: category,
    cmtype: "subcat",
    cmlimit: String(limit),
  });
  return (j.query?.categorymembers ?? []).map((m: { title: string }) => m.title);
}

const BAD_SUBCAT =
  /interior|cabin|cockpit|accident|crash|incident|model|museum|scrapped|wreck|drawing|logo|patch|window view|with other subjects|seat/i;
/** "… by airline", "… by year": subcategories that only hold more subcategories. */
const CONTAINER_SUBCAT = /\bby [a-z]/i;

/**
 * Files of a category. Airliner categories are mostly containers, so when there are
 * few files directly inside we descend into the leaf subcategories ("… take offs",
 * "… on final approach", "… of <airline>") and, as a last resort, one level below
 * a "by airline"/"by year" container.
 */
async function collectFiles(category: string, limit: number): Promise<string[]> {
  const out: string[] = [];
  const push = (files: string[]) => {
    for (const f of files) if (!out.includes(f)) out.push(f);
  };
  push(await listFiles(category, limit));

  // Leaf subcategories ("… take offs", "… of <airline>") are where the good
  // photographs live; pull from them too rather than settling for whatever
  // happens to sit loose in the parent category.
  const subs = out.length >= limit ? [] : await listSubcategories(category, 30);
  const leaves = subs.filter((s) => !BAD_SUBCAT.test(s) && !CONTAINER_SUBCAT.test(s)).slice(0, 8);
  for (const sub of leaves) {
    if (out.length >= limit) break;
    push(await listFiles(sub, 10));
  }
  if (out.length >= 12) return out.slice(0, limit);

  const containers = subs
    .filter((s) => CONTAINER_SUBCAT.test(s) && !BAD_SUBCAT.test(s))
    .sort((a, b) => rankContainer(a) - rankContainer(b));
  for (const container of containers.slice(0, 2)) {
    const inner = (await listSubcategories(container, 20)).filter((s) => !BAD_SUBCAT.test(s));
    for (const sub of inner.slice(0, 6)) {
      if (out.length >= limit) break;
      push(await listFiles(sub, 6));
    }
    if (out.length >= 8) break;
  }
  return out.slice(0, limit);
}

function rankContainer(title: string): number {
  if (/by airline/i.test(title)) return 0;
  if (/by year/i.test(title)) return 1;
  if (/by location|by country/i.test(title)) return 2;
  return 3;
}

async function fileMeta(files: string[]): Promise<FileMeta[]> {
  const out: FileMeta[] = [];
  for (const batch of chunk(files, TITLES_PER_BATCH)) {
    const j = await api({
      action: "query",
      titles: batch.join("|"),
      prop: "categories|imageinfo",
      clshow: "!hidden",
      cllimit: "50",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: "1280",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|DateTimeOriginal|ImageDescription|Categories",
    });
    for (const p of j.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const em = ii.extmetadata ?? {};
      const cats = new Set<string>();
      for (const c of p.categories ?? []) cats.add(String(c.title).replace(/^Category:/, ""));
      for (const c of (stripHtml(em.Categories?.value) ?? "").split("|")) if (c.trim()) cats.add(c.trim());
      out.push({
        title: p.title,
        mime: ii.mime ?? "",
        width: ii.width ?? 0,
        height: ii.height ?? 0,
        src: ii.thumburl ?? ii.url,
        pageUrl: ii.descriptionurl,
        categories: [...cats],
        description: stripHtml(em.ImageDescription?.value),
        date: stripHtml(em.DateTimeOriginal?.value),
        author: stripHtml(em.Artist?.value),
        license: stripHtml(em.LicenseShortName?.value),
        licenseUrl: stripHtml(em.LicenseUrl?.value),
      });
    }
  }
  return out;
}

async function scoredCandidates(files: string[], ctx: ScoreContext): Promise<Candidate[]> {
  if (!files.length) return [];
  const metas = await fileMeta(files);
  const cands: Candidate[] = [];
  for (const m of metas) {
    const s = scoreFile(m, ctx);
    if (s) cands.push(toCandidate(m, s));
  }
  cands.sort((a, b) => b.score - a.score || b.width - a.width);
  return cands.slice(0, KEEP_CANDIDATES);
}

// ---------------------------------------------------------------------------
// Type categories
// ---------------------------------------------------------------------------

async function resolveTypeCategory(typeName: string): Promise<string | null> {
  const curated = TYPE_CATEGORIES[typeName]?.category;
  const guesses = curated ? [curated, `Category:${typeName}`] : [`Category:${typeName}`];
  const exists = await categoriesExist(guesses);
  for (const g of guesses) if (exists.has(g)) return g;

  const j = await api({ action: "query", list: "search", srnamespace: "14", srsearch: typeName, srlimit: "10" });
  const hits: string[] = (j.query?.search ?? []).map((s: { title: string }) => s.title);
  const tokens = searchTokens(typeName);
  for (const hit of hits) {
    const t = hit.replace(/^Category:/, "").toLowerCase();
    if (BAD_SUBCAT.test(t)) continue;
    if (/^[a-z0-9]{1,2}-[a-z0-9]{2,5} \(/.test(t)) continue; // a single tail's category
    if (tokens.some((tok) => t.includes(tok))) return hit;
  }
  return null;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

interface FleetRow {
  reg: string;
  operator: string;
  typeName: string;
}

function readFleet(dir: string): FleetRow[] {
  const rows = new Map<string, FleetRow>();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const parsed = JSON.parse(readFileSync(join(dir, f), "utf8")) as ParseResult;
    for (const a of parsed.aircraft) {
      const op = identifyOperator(a.operatorName, a.operatorBrandRaw);
      const cls = classifyModel(a.model, a.wing);
      const type = canonicalizeType(cls, null);
      rows.set(a.reg, { reg: a.reg, operator: op.name, typeName: type.name });
    }
  }
  return [...rows.values()].sort((a, b) => a.reg.localeCompare(b.reg));
}

function loadJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function save(file: string, data: unknown) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 1));
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) throw new Error("usage: images.ts <parsed snapshot dir> [--skip-regs] [--skip-types]");
  const skipRegs = args.includes("--skip-regs");
  const skipTypes = args.includes("--skip-types");

  const fleet = readFleet(dir);
  const maxAgeDays = Number(process.env.IMAGE_CACHE_DAYS ?? 45);
  const stale = (t: string | undefined) => !t || (Date.now() - Date.parse(t)) / 86400000 > maxAgeDays;
  const now = new Date().toISOString();

  const candidates = loadJson<CandidateCache>(CANDIDATE_CACHE, {});
  const types = loadJson<TypeCandidateCache>(TYPE_CACHE, {});
  const exact = loadJson<ExactCache>(EXACT_CACHE, {});

  // ---- pass 1: exact tail --------------------------------------------------
  if (!skipRegs) {
    const todo = fleet.filter((r) => stale(candidates[r.reg]?.checkedAt));
    console.log(`registrations: ${fleet.length} fresh=${fleet.length - todo.length} toCheck=${todo.length}`);
    const have = await categoriesExist(todo.map((r) => `Category:${r.reg} (aircraft)`));
    console.log(`  categories on Commons: ${have.size}`);

    for (const r of todo) {
      if (have.has(`Category:${r.reg} (aircraft)`)) continue;
      candidates[r.reg] = { checkedAt: now, category: null, candidates: [] };
      exact[r.reg] = { checkedAt: now, image: null, category: false };
    }

    const withCategory = todo.filter((r) => have.has(`Category:${r.reg} (aircraft)`));
    let done = 0;
    await pool(withCategory, CONCURRENCY, async (row) => {
      const category = `Category:${row.reg} (aircraft)`;
      const files = await listFiles(category, MAX_FILES_PER_REG);
      const scored = await scoredCandidates(files, { reg: row.reg, operator: row.operator });
      candidates[row.reg] = { checkedAt: now, category, candidates: scored };
      const best = scored[0];
      exact[row.reg] = {
        checkedAt: now,
        image: best && best.score >= 0 ? stripScore(best) : null,
        category: true,
      };
      if (++done % 25 === 0) {
        console.log(`  scored ${done}/${withCategory.length} (${requests} requests)`);
        save(CANDIDATE_CACHE, candidates);
        save(EXACT_CACHE, exact);
      }
    });
    save(CANDIDATE_CACHE, candidates);
    save(EXACT_CACHE, exact);
    const usable = Object.values(candidates).filter((c) => c.candidates.some((x) => x.score >= 0)).length;
    console.log(`  exact-tail candidates for ${usable}/${fleet.length} registrations`);
  }

  // ---- pass 2: type-world --------------------------------------------------
  if (!skipTypes) {
    const typeNames = [...new Set(fleet.map((r) => r.typeName))].sort();
    const todo = typeNames.filter((t) => stale(types[t]?.checkedAt));
    console.log(`types: ${typeNames.length} fresh=${typeNames.length - todo.length} toCheck=${todo.length}`);
    let done = 0;
    await pool(todo, CONCURRENCY, async (typeName) => {
      const category = await resolveTypeCategory(typeName);
      if (!category) {
        types[typeName] = { checkedAt: now, category: null, candidates: [] };
        console.log(`  ! no category for "${typeName}"`);
      } else {
        const files = await collectFiles(category, MAX_FILES_PER_TYPE);
        const scored = await scoredCandidates(files, { type: TYPE_CATEGORIES[typeName] ?? null });
        types[typeName] = { checkedAt: now, category, candidates: scored };
        if (!scored.length) console.log(`  ! no usable file in ${category} for "${typeName}"`);
      }
      if (++done % 10 === 0) {
        console.log(`  types ${done}/${todo.length} (${requests} requests)`);
        save(TYPE_CACHE, types);
      }
    });
    save(TYPE_CACHE, types);
    const covered = Object.values(types).filter((t) => t.candidates.some((c) => c.score >= 0)).length;
    console.log(`  type-world candidates for ${covered}/${typeNames.length} types`);
  }

  console.log(`done. ${requests} API requests.`);
}

function stripScore(c: Candidate): CommonsImage {
  const { score, flags, ...image } = c;
  void score;
  void flags;
  return image;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
