import type { IndexRecord } from "@/lib/types";

export interface AircraftHit {
  kind: "aircraft";
  rec: IndexRecord;
  score: number;
}
export interface OperatorHit {
  kind: "operator";
  id: string;
  name: string;
  count: number;
  score: number;
}
export interface TypeHit {
  kind: "type";
  name: string;
  icao: string | null;
  count: number;
  score: number;
}

export interface Ranked {
  aircraft: AircraftHit[];
  operators: OperatorHit[];
  types: TypeHit[];
}

const EMPTY: Ranked = { aircraft: [], operators: [], types: [] };

/** Uppercase, collapse spaces. */
function norm(s: string) {
  return s.toUpperCase().replace(/\s+/g, " ").trim();
}
/** Letters and digits only, with a leading VT prefix removed: "vt-anu" -> "ANU". */
function regKey(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^VT/, "");
}

/** Does any word in `hay` start with `q`? Cheaper and sharper than a bare includes. */
function wordPrefix(hay: string, q: string) {
  if (hay.startsWith(q)) return true;
  let at = hay.indexOf(q);
  while (at > 0) {
    if (!/[A-Z0-9]/.test(hay[at - 1])) return true;
    at = hay.indexOf(q, at + 1);
  }
  return false;
}

function scoreAircraft(a: IndexRecord, q: string, rq: string): number {
  const suffix = regKey(a.r);
  if (rq) {
    if (suffix === rq) return 0;
    if (a.h && a.h.toUpperCase() === rq) return 2;
    if (suffix.startsWith(rq)) return 10;
    if (a.h && a.h.toUpperCase().startsWith(rq)) return 14;
  }
  if (a.ti && a.ti.toUpperCase() === q) return 16;
  const op = a.on.toUpperCase();
  if (wordPrefix(op, q)) return 20;
  const type = a.t.toUpperCase();
  if (wordPrefix(type, q)) return 22;
  const model = a.m.toUpperCase();
  if (wordPrefix(model, q) || wordPrefix(a.mf.toUpperCase(), q)) return 24;
  const hay = `${a.r} ${suffix} ${a.h ?? ""} ${op} ${type} ${model} ${a.mf} ${a.ti ?? ""}`.toUpperCase();
  const tokens = q.split(" ");
  if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) return 30;
  if (q.length >= 3 && hay.includes(q)) return 32;
  return -1;
}

function scoreName(name: string, icao: string | null, q: string): number {
  const n = name.toUpperCase();
  if (n === q || (icao && icao.toUpperCase() === q)) return 0;
  if (icao && icao.toUpperCase().startsWith(q)) return 1;
  if (n.startsWith(q)) return 2;
  if (wordPrefix(n, q)) return 3;
  if (q.length >= 3 && n.includes(q)) return 4;
  return -1;
}

/** Rank aircraft, operators and types for one query. Caps are applied by the caller. */
export function rank(data: IndexRecord[], query: string): Ranked {
  const q = norm(query);
  if (!q) return EMPTY;
  const rq = regKey(q);

  const aircraft: AircraftHit[] = [];
  const operators = new Map<string, { name: string; count: number }>();
  const types = new Map<string, { icao: string | null; count: number }>();

  for (const rec of data) {
    const score = scoreAircraft(rec, q, rq);
    if (score >= 0) aircraft.push({ kind: "aircraft", rec, score });
    const o = operators.get(rec.o);
    if (o) o.count += 1;
    else operators.set(rec.o, { name: rec.on, count: 1 });
    const t = types.get(rec.t);
    if (t) t.count += 1;
    else types.set(rec.t, { icao: rec.ti, count: 1 });
  }
  aircraft.sort((x, y) => x.score - y.score || x.rec.r.localeCompare(y.rec.r));

  const opHits: OperatorHit[] = [];
  for (const [id, o] of operators) {
    const score = scoreName(o.name, null, q);
    if (score >= 0) opHits.push({ kind: "operator", id, name: o.name, count: o.count, score });
  }
  opHits.sort((x, y) => x.score - y.score || y.count - x.count || x.name.localeCompare(y.name));

  const typeHits: TypeHit[] = [];
  for (const [name, t] of types) {
    const score = scoreName(name, t.icao, q);
    if (score >= 0) typeHits.push({ kind: "type", name, icao: t.icao, count: t.count, score });
  }
  typeHits.sort((x, y) => x.score - y.score || y.count - x.count || x.name.localeCompare(y.name));

  return { aircraft, operators: opHits, types: typeHits };
}

const RECENT_KEY = "vt.search.recent";
const RECENT_MAX = 5;

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function pushRecent(q: string): string[] {
  const value = q.trim();
  if (!value) return readRecent();
  const next = [value, ...readRecent().filter((r) => r.toLowerCase() !== value.toLowerCase())].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode or blocked storage: recents are a convenience only */
  }
  return next;
}
