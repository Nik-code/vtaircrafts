// Assign a photograph to every aircraft from the scored Commons candidates.
//
// Tiers, best adjusted score wins (ties break towards the more specific tier):
//   exact          this tail                          score + 35
//   operator-type  same operator, same type           score + 15
//   type           same type, another Indian operator score, and only if >= 40
//   type-world     same type anywhere in the world    score
//
// Candidates come from data/cache/commons/candidates.json and types.json, written
// by pipeline/images.ts. The legacy exact.json passed in by build.ts is used only
// as a fallback when candidates.json has not been generated yet.
//
// Siblings do not all get the same photograph: inside the winning tier every
// candidate within SPREAD points of the best one is eligible and the registration
// picks one by a stable hash.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Candidate, CandidateCache, CommonsImage, TypeCandidateCache } from "../images";
import { canonicalThumbUrl } from "./text";
import { UNSUITABLE_SUBJECT } from "./photoRules";

export type ImageTier = "exact" | "operator-type" | "type" | "type-world";

export interface ImageAssignable {
  reg: string;
  operatorId: string;
  model: string;
  type: { name: string };
  image: (CommonsImage & { tier: ImageTier; ofReg: string | null }) | null;
}

export interface ImageCacheEntry {
  checkedAt: string;
  image: CommonsImage | null;
  category: boolean;
}

export type ImageCache = Record<string, ImageCacheEntry>;

export interface ImageCaches {
  candidates: CandidateCache;
  types: TypeCandidateCache;
}

export interface AssignedPick {
  reg: string;
  tier: ImageTier;
  ofReg: string | null;
  score: number;
  adjusted: number;
  file: string;
  flags: string[];
}

export interface AssignResult {
  counts: Record<ImageTier | "none", number>;
  picks: Map<string, AssignedPick>;
}

const BONUS: Record<ImageTier, number> = { exact: 35, "operator-type": 15, type: 0, "type-world": 0 };
/**
 * Extra margin a sibling must beat the aircraft's own photograph by before it
 * displaces it. With the bonuses alone a sibling only needs to score 20 points
 * higher, and the best of forty IndiGo tails almost always does - which loses the
 * photograph of the actual registration for the sake of a slightly nicer picture.
 * Set to 0 for the plain "highest adjusted score wins" rule.
 */
const EXACT_HYSTERESIS = 15;
/** The cross-operator tier only accepts photographs that are at least ordinary. */
const MIN_TYPE_SCORE = 40;
/**
 * How far below the best a candidate may be and still be picked, for variety.
 * 25 is one quality step: the best photograph of a 159-aircraft IndiGo A321neo
 * fleet tends to be the single in-flight shot, and without this every one of those
 * aircraft would show the same picture.
 */
const SPREAD = 25;
const SPREAD_CAP = 12;

const CACHE_DIR = join("data", "cache", "commons");
/** Score given to an image from the legacy exact.json cache, which carries no score. */
const BASE_LEGACY_SCORE = 50;

function readCache<T>(file: string): T {
  if (!existsSync(file)) return {} as T;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return {} as T;
  }
}

let loaded: ImageCaches | null = null;
function defaultCaches(): ImageCaches {
  if (!loaded) {
    loaded = {
      candidates: readCache<CandidateCache>(join(CACHE_DIR, "candidates.json")),
      types: readCache<TypeCandidateCache>(join(CACHE_DIR, "types.json")),
    };
  }
  return loaded;
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface PoolEntry {
  cand: Candidate;
  ofReg: string | null;
  operatorId: string | null;
}

/**
 * Pick from the entries within SPREAD of the best, chosen by a stable hash of the
 * registration, so siblings do not all show the same photograph. `floor` is the best
 * adjusted score the losing tiers could offer: variety must never hand an aircraft
 * something worse than the photograph of its own tail.
 */
function pickSpread(entries: PoolEntry[], seed: string, bonus: number, floor: number, poolSize = SPREAD_CAP): PoolEntry {
  const best = entries[0].cand.score;
  // Never spread wider than the number of aircraft that share the pool: a lone aircraft of
  // its type gets the best photograph, two aircraft the best two, and so on.
  const near = entries
    .filter((e) => e.cand.score >= best - SPREAD && e.cand.score + bonus > floor)
    .slice(0, Math.min(SPREAD_CAP, Math.max(1, poolSize)));
  if (!near.length) return entries[0];
  return near[hash(seed) % near.length];
}

const TIER_ORDER: ImageTier[] = ["exact", "operator-type", "type", "type-world"];

function stripScore(c: Candidate): CommonsImage {
  return {
    file: c.file,
    src: canonicalThumbUrl(c.src),
    width: c.width,
    height: c.height,
    author: c.author,
    license: c.license,
    licenseUrl: c.licenseUrl,
    pageUrl: c.pageUrl,
    date: c.date,
  };
}

export function assignImagesDetailed(
  aircraft: ImageAssignable[],
  cache: ImageCache,
  caches: ImageCaches = defaultCaches(),
): AssignResult {
  const { candidates, types } = caches;
  const usingCandidates = Object.keys(candidates).length > 0;

  // Candidates per registration, best first, unusable ones dropped.
  const byReg = new Map<string, Candidate[]>();
  for (const a of aircraft) {
    let list = candidates[a.reg]?.candidates ?? [];
    if (!usingCandidates) {
      const legacy = cache[a.reg]?.image;
      list = legacy ? [{ ...legacy, score: BASE_LEGACY_SCORE, flags: ["legacy"] }] : [];
    }
    const usable = list.filter((c) => c && c.score >= 0 && !UNSUITABLE_SUBJECT.test(c.file)).sort((x, y) => y.score - x.score);
    if (usable.length) byReg.set(a.reg, usable);
  }

  // Pools: each registration contributes its best photograph.
  const byOpType = new Map<string, PoolEntry[]>();
  const byType = new Map<string, PoolEntry[]>();
  for (const a of aircraft) {
    const best = byReg.get(a.reg)?.[0];
    if (!best) continue;
    const entry: PoolEntry = { cand: best, ofReg: a.reg, operatorId: a.operatorId };
    const key = `${a.operatorId}|${a.type.name}`;
    const opList = byOpType.get(key);
    if (opList) opList.push(entry);
    else byOpType.set(key, [entry]);
    const typeList = byType.get(a.type.name);
    if (typeList) typeList.push(entry);
    else byType.set(a.type.name, [entry]);
  }
  for (const list of byOpType.values()) list.sort((x, y) => y.cand.score - x.cand.score);
  for (const list of byType.values()) list.sort((x, y) => y.cand.score - x.cand.score);

  // How many aircraft draw from each pool: variety only makes sense when more than one does.
  const opTypeCount = new Map<string, number>();
  const typeCount = new Map<string, number>();
  for (const a of aircraft) {
    const key = `${a.operatorId}|${a.type.name}`;
    opTypeCount.set(key, (opTypeCount.get(key) ?? 0) + 1);
    typeCount.set(a.type.name, (typeCount.get(a.type.name) ?? 0) + 1);
  }

  const counts: Record<ImageTier | "none", number> = { exact: 0, "operator-type": 0, type: 0, "type-world": 0, none: 0 };
  const picks = new Map<string, AssignedPick>();

  for (const a of aircraft) {
    const options: Array<{ tier: ImageTier; entries: PoolEntry[] }> = [];

    const own = byReg.get(a.reg);
    if (own?.length) options.push({ tier: "exact", entries: [{ cand: own[0], ofReg: a.reg, operatorId: a.operatorId }] });

    const siblings = (byOpType.get(`${a.operatorId}|${a.type.name}`) ?? []).filter((e) => e.ofReg !== a.reg);
    if (siblings.length) options.push({ tier: "operator-type", entries: siblings });

    const sameType = (byType.get(a.type.name) ?? []).filter(
      (e) => e.operatorId !== a.operatorId && e.cand.score >= MIN_TYPE_SCORE,
    );
    if (sameType.length) options.push({ tier: "type", entries: sameType });

    const world = (types[a.type.name]?.candidates ?? [])
      .filter((c) => c && c.score >= 0 && !UNSUITABLE_SUBJECT.test(c.file))
      .sort((x, y) => y.score - x.score)
      .map((cand) => ({ cand, ofReg: null, operatorId: null }));
    if (world.length) options.push({ tier: "type-world", entries: world });

    if (!options.length) {
      a.image = null;
      counts.none++;
      continue;
    }
    // Best tier by its best candidate; a tie goes to the more specific tier.
    const ranked = options
      .map((o) => ({ ...o, top: o.entries[0].cand.score + BONUS[o.tier] }))
      .sort((x, y) => y.top - x.top || TIER_ORDER.indexOf(x.tier) - TIER_ORDER.indexOf(y.tier));
    const exactOption = ranked.find((o) => o.tier === "exact");
    let winner = ranked[0];
    if (exactOption && winner.tier !== "exact" && winner.top - exactOption.top <= EXACT_HYSTERESIS) {
      winner = exactOption;
    }
    // Variety may not drop below what a MORE specific tier offered (in practice: the
    // photograph of this very tail). Less specific tiers do not constrain it - a
    // plain photograph of a sibling in the right livery beats a prettier foreign one.
    const rank = TIER_ORDER.indexOf(winner.tier);
    const floor = Math.max(
      ...ranked.filter((o) => TIER_ORDER.indexOf(o.tier) < rank).map((o) => o.top),
      Number.NEGATIVE_INFINITY,
    );
    const poolSize =
      winner.tier === "operator-type" ? opTypeCount.get(`${a.operatorId}|${a.type.name}`) ?? 1 : typeCount.get(a.type.name) ?? 1;
    const entry =
      winner.tier === "exact" ? winner.entries[0] : pickSpread(winner.entries, a.reg, BONUS[winner.tier], floor, poolSize);

    a.image = { ...stripScore(entry.cand), tier: winner.tier, ofReg: entry.ofReg };
    counts[winner.tier]++;
    picks.set(a.reg, {
      reg: a.reg,
      tier: winner.tier,
      ofReg: entry.ofReg,
      score: entry.cand.score,
      adjusted: entry.cand.score + BONUS[winner.tier],
      file: entry.cand.file,
      flags: entry.cand.flags ?? [],
    });
  }
  return { counts, picks };
}

export function assignImages(aircraft: ImageAssignable[], cache: ImageCache): Record<ImageTier | "none", number> {
  return assignImagesDetailed(aircraft, cache).counts;
}
