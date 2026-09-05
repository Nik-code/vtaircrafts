import type { IndexRecord } from "@/lib/types";
import { CATEGORY_LABEL, ROLE_LABEL, WING_LABEL } from "./indexData";

export type SortKey = "reg" | "operator" | "type" | "seats" | "seatsAsc" | "first" | "firstOldest";
export type ViewKey = "cards" | "plates" | "table";

export const LIST_KEYS = ["c", "w", "o", "mf", "t", "ro", "y"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export interface FleetState {
  q: string;
  lists: Record<ListKey, string[]>;
  smin: number | null;
  smax: number | null;
  sort: SortKey;
  view: ViewKey;
  /** 1-indexed. */
  page: number;
}

export const EMPTY_LISTS: Record<ListKey, string[]> = { c: [], w: [], o: [], mf: [], t: [], ro: [], y: [] };

const SORTS: SortKey[] = ["reg", "operator", "type", "seats", "seatsAsc", "first", "firstOldest"];
const VIEWS: ViewKey[] = ["cards", "plates", "table"];

export const SORT_LABEL: Record<SortKey, string> = {
  reg: "Registration",
  operator: "Operator",
  type: "Type",
  seats: "Seats, high to low",
  seatsAsc: "Seats, low to high",
  first: "Newest on list",
  firstOldest: "Oldest on list",
};

export const GROUP_LABEL: Record<ListKey, string> = {
  c: "Category",
  w: "Airframe",
  o: "Operator",
  mf: "Manufacturer",
  t: "Type",
  ro: "Role",
  y: "On list since",
};

export const VALUE_OF: Record<ListKey, (a: IndexRecord) => string> = {
  c: (a) => a.c,
  w: (a) => a.w,
  o: (a) => a.o,
  mf: (a) => a.mf,
  t: (a) => a.t,
  ro: (a) => a.ro,
  y: (a) => a.f.slice(0, 4),
};

export function valueLabel(key: ListKey, value: string, operatorNames: Map<string, string>): string {
  if (key === "c") return CATEGORY_LABEL[value] ?? value;
  if (key === "w") return WING_LABEL[value as keyof typeof WING_LABEL] ?? value;
  if (key === "ro") return ROLE_LABEL[value] ?? value;
  if (key === "o") return operatorNames.get(value) ?? value;
  return value;
}

/* ---------- URL state ---------- */

export function parseFleetState(search: string): FleetState {
  const p = new URLSearchParams(search);
  const lists = { ...EMPTY_LISTS } as Record<ListKey, string[]>;
  for (const k of LIST_KEYS) {
    const raw = p.get(k);
    lists[k] = raw ? raw.split(",").map((v) => v.trim()).filter(Boolean) : [];
  }
  const num = (k: string) => {
    const v = p.get(k);
    if (v == null || v === "") return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  const sort = p.get("sort") as SortKey | null;
  const view = p.get("view") as ViewKey | null;
  const page = num("p");
  return {
    q: p.get("q") ?? "",
    lists,
    smin: num("smin"),
    smax: num("smax"),
    sort: sort && SORTS.includes(sort) ? sort : "reg",
    view: view && VIEWS.includes(view) ? view : "cards",
    page: page && page > 0 ? page : 1,
  };
}

export function serializeFleetState(s: FleetState): string {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  for (const k of LIST_KEYS) if (s.lists[k].length) p.set(k, s.lists[k].join(","));
  if (s.smin != null) p.set("smin", String(s.smin));
  if (s.smax != null) p.set("smax", String(s.smax));
  if (s.sort !== "reg") p.set("sort", s.sort);
  if (s.view !== "cards") p.set("view", s.view);
  if (s.page > 1) p.set("p", String(s.page));
  return p.toString();
}

export function countActive(s: FleetState): number {
  let n = s.q.trim() ? 1 : 0;
  for (const k of LIST_KEYS) n += s.lists[k].length;
  if (s.smin != null || s.smax != null) n += 1;
  return n;
}

/* ---------- matching ---------- */

export function matchesQuery(a: IndexRecord, query: string): boolean {
  const q = query.toUpperCase().replace(/\s+/g, " ").trim();
  if (!q) return true;
  const compact = q.replace(/[^A-Z0-9]/g, "").replace(/^VT/, "");
  if (compact && compact.length <= 3 && a.r.replace("VT-", "").startsWith(compact)) return true;
  const hay = `${a.r} ${a.r.replace("-", "")} ${a.h ?? ""} ${a.on} ${a.m} ${a.t} ${a.ti ?? ""} ${a.mf}`.toUpperCase();
  return q.split(" ").every((token) => hay.includes(token));
}

const PRED_KEYS = ["q", "seats", ...LIST_KEYS] as const;
type PredKey = (typeof PRED_KEYS)[number];

function predicateFor(key: PredKey, s: FleetState): (a: IndexRecord) => boolean {
  if (key === "q") {
    const q = s.q.trim();
    return q ? (a) => matchesQuery(a, q) : () => true;
  }
  if (key === "seats") {
    if (s.smin == null && s.smax == null) return () => true;
    return (a) => a.s != null && (s.smin == null || a.s >= s.smin) && (s.smax == null || a.s <= s.smax);
  }
  const selected = s.lists[key];
  if (!selected.length) return () => true;
  const set = new Set(selected);
  const value = VALUE_OF[key];
  return (a) => set.has(value(a));
}

export interface FacetItem {
  value: string;
  count: number;
  selected: boolean;
}

export interface FleetResult {
  results: IndexRecord[];
  /** Counts per group, computed with every other group's filters applied. */
  facets: Record<ListKey, FacetItem[]>;
}

const COMPARATORS: Record<SortKey, (x: IndexRecord, y: IndexRecord) => number> = {
  reg: (x, y) => x.r.localeCompare(y.r),
  operator: (x, y) => x.on.localeCompare(y.on) || x.r.localeCompare(y.r),
  type: (x, y) => x.t.localeCompare(y.t) || x.r.localeCompare(y.r),
  seats: (x, y) => (y.s ?? -1) - (x.s ?? -1) || x.r.localeCompare(y.r),
  seatsAsc: (x, y) => (x.s ?? Infinity) - (y.s ?? Infinity) || x.r.localeCompare(y.r),
  first: (x, y) => y.f.localeCompare(x.f) || x.r.localeCompare(y.r),
  firstOldest: (x, y) => x.f.localeCompare(y.f) || x.r.localeCompare(y.r),
};

const FIXED_ORDER: Partial<Record<ListKey, string[]>> = {
  c: ["S", "N"],
  w: ["FW", "RW", "B"],
  ro: ["passenger", "cargo", "aerial-work", "mixed", "unknown"],
};

/** Category, airframe and role keep their natural order; years run newest first; the rest by count. */
function facetOrder(key: ListKey): (a: FacetItem, b: FacetItem) => number {
  const fixed = FIXED_ORDER[key];
  if (fixed) {
    const rank = (v: string) => {
      const i = fixed.indexOf(v);
      return i === -1 ? fixed.length : i;
    };
    return (a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value);
  }
  if (key === "y") return (a, b) => b.value.localeCompare(a.value);
  return (a, b) => b.count - a.count || a.value.localeCompare(b.value);
}

/**
 * One pass over the index builds a pass/fail bitmask per record, from which both
 * the result set and every facet count (all filters except that facet's own) fall out.
 */
export function runFleetQuery(data: IndexRecord[], s: FleetState): FleetResult {
  const preds = PRED_KEYS.map((k) => predicateFor(k, s));
  const full = (1 << PRED_KEYS.length) - 1;
  const masks = new Int32Array(data.length);
  const results: IndexRecord[] = [];
  for (let i = 0; i < data.length; i++) {
    let mask = 0;
    for (let b = 0; b < preds.length; b++) if (preds[b](data[i])) mask |= 1 << b;
    masks[i] = mask;
    if (mask === full) results.push(data[i]);
  }

  const facets = {} as Record<ListKey, FacetItem[]>;
  for (const key of LIST_KEYS) {
    const bit = 1 << PRED_KEYS.indexOf(key);
    const value = VALUE_OF[key];
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i++) {
      if ((masks[i] | bit) !== full) continue;
      const v = value(data[i]);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const selected = new Set(s.lists[key]);
    for (const v of selected) if (!counts.has(v)) counts.set(v, 0);
    facets[key] = [...counts.entries()]
      .map(([value_, count]) => ({ value: value_, count, selected: selected.has(value_) }))
      .sort(facetOrder(key));
  }

  results.sort(COMPARATORS[s.sort]);
  return { results, facets };
}
