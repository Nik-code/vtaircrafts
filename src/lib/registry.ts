// Views derived from the dataset at build time: types, owners, fleet age and yearly counts.
import { getAircraft, getArchive, getEnrichment, getEvents, getMeta, getOperators, getTypeSpec } from "./data";
import type { Aircraft, ArchivedAircraft, Enrichment, TypeSpec } from "./types";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The year the airframe was built: DGCA's year of manufacture first, VRS standing-data second. */
export function builtYear(a: Aircraft): { year: number; source: "dgca" | "vrs" } | null {
  if (a.history?.yearOfManufacture) return { year: a.history.yearOfManufacture, source: "dgca" };
  const v = getEnrichment(a.reg)?.builtYear;
  return v ? { year: v, source: "vrs" } : null;
}

/** Age in whole years at the dataset's snapshot date, not today, so pages stay stable between builds. */
export function ageOf(a: Aircraft): number | null {
  const b = builtYear(a);
  if (!b) return null;
  return Math.max(0, Number(getMeta().snapshot.slice(0, 4)) - b.year);
}

export interface AgeSummary {
  mean: number | null;
  known: number;
  total: number;
}

export function ageSummary(fleet: Aircraft[]): AgeSummary {
  const ages = fleet.map(ageOf).filter((x): x is number => x != null);
  return { mean: ages.length ? ages.reduce((s, x) => s + x, 0) / ages.length : null, known: ages.length, total: fleet.length };
}

// ---------------------------------------------------------------------------------------------
// Types

export interface TypeGroup {
  slug: string;
  name: string;
  icao: string | null;
  manufacturer: string;
  family: string;
  wing: Aircraft["wing"];
  aircraft: Aircraft[];
  archived: ArchivedAircraft[];
  operators: Array<{ id: string; name: string; count: number }>;
  seats: { min: number; max: number } | null;
  age: AgeSummary;
  engines: Array<{ name: string; count: number }>;
  spec: TypeSpec | undefined;
}

let typeCache: TypeGroup[] | undefined;

export function getTypes(): TypeGroup[] {
  if (typeCache) return typeCache;
  const groups = new Map<string, Aircraft[]>();
  for (const a of getAircraft()) {
    const list = groups.get(a.type.name) ?? [];
    list.push(a);
    groups.set(a.type.name, list);
  }
  const archivedByName = new Map<string, ArchivedAircraft[]>();
  for (const a of getArchive()) {
    const list = archivedByName.get(a.type.name) ?? [];
    list.push(a);
    archivedByName.set(a.type.name, list);
  }
  typeCache = [...groups.entries()]
    .map(([name, fleet]) => {
      const first = fleet[0];
      const ops = new Map<string, { id: string; name: string; count: number }>();
      for (const a of fleet) {
        const o = ops.get(a.operatorId) ?? { id: a.operatorId, name: a.operator, count: 0 };
        o.count += 1;
        ops.set(a.operatorId, o);
      }
      const seats = fleet.map((a) => a.seats).filter((s): s is number => s != null && s > 0);
      const engines = new Map<string, number>();
      for (const a of fleet) {
        const e = getEnrichment(a.reg)?.engine;
        if (e) engines.set(e, (engines.get(e) ?? 0) + 1);
      }
      return {
        slug: slugify(name),
        name,
        icao: first.type.icao,
        manufacturer: first.type.manufacturer,
        family: first.type.family,
        wing: first.wing,
        aircraft: [...fleet].sort((x, y) => x.reg.localeCompare(y.reg)),
        archived: (archivedByName.get(name) ?? []).sort((x, y) => x.reg.localeCompare(y.reg)),
        operators: [...ops.values()].sort((x, y) => y.count - x.count || x.name.localeCompare(y.name)),
        seats: seats.length ? { min: Math.min(...seats), max: Math.max(...seats) } : null,
        age: ageSummary(fleet),
        engines: [...engines.entries()].map(([n, count]) => ({ name: n, count })).sort((x, y) => y.count - x.count),
        spec: getTypeSpec(first.type.icao),
      };
    })
    .sort((x, y) => y.aircraft.length - x.aircraft.length || x.name.localeCompare(y.name));
  return typeCache;
}

export function getType(slug: string): TypeGroup | undefined {
  return getTypes().find((t) => t.slug === slug);
}

export function typeSlugOf(name: string): string | null {
  const slug = slugify(name);
  return getTypes().some((t) => t.slug === slug) ? slug : null;
}

// ---------------------------------------------------------------------------------------------
// Owners and lessors, as printed in DGCA registration reports. Leasing companies register
// aircraft through numbered special purpose companies; fold those into one name only where
// the family is unambiguous from the name itself.

const FAMILIES: Array<[RegExp, string]> = [
  [/\bSMBC\b/i, "SMBC Aviation Capital"],
  [/\bAVOLON\b/i, "Avolon"],
  [/\bJACKSON SQUARE\b/i, "Jackson Square Aviation"],
  [/\bBOC AVIATION\b/i, "BOC Aviation"],
  [/\bCELESTIAL AVIATION\b/i, "Celestial Aviation (AerCap)"],
  [/\bAERCAP\b/i, "AerCap"],
  [/\bALC\b|\bAIR LEASE\b/i, "Air Lease Corporation"],
  [/\bACG\b|\bAVIATION CAPITAL GROUP\b/i, "Aviation Capital Group"],
  [/\bNAC AVIATION\b|\bNORDIC AVIATION\b/i, "Nordic Aviation Capital"],
  [/\bPEMBROKE\b/i, "Pembroke Aircraft Leasing"],
  [/\bAIRCASTLE\b/i, "Aircastle"],
  [/\bORIX AVIATION\b/i, "ORIX Aviation"],
  [/\bALAFCO\b/i, "ALAFCO"],
  [/\bCDB AVIATION\b/i, "CDB Aviation"],
  [/\bGOSHAWK\b/i, "Goshawk"],
  [/\bINDICAN LEASING\b/i, "Indican Leasing"],
  [/\bMAPLE LEAF\b/i, "Maple Leaf Financing"],
  [/\bINTERGLOBE AVIATION FINANCIAL\b/i, "InterGlobe Aviation Financial Services"],
  [/\bWILMINGTON TRUST\b/i, "Wilmington Trust (as trustee)"],
  [/\bAIR INDIA EXPRESS\b/i, "Air India Express"],
  [/\bAIR INDIA\b/i, "Air India"],
  [/\bINTERGLOBE AVIATION\b/i, "InterGlobe Aviation (IndiGo)"],
];

const TRUSTEE = /\bWILMINGTON TRUST\b|\bUMB BANK\b|\bBANK OF UTAH\b/i;

function cleanOwner(raw: string): string | null {
  let s = raw
    .replace(/^\s*M\/S\.?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop postal addresses DGCA sometimes prints after the name. A number inside the name itself
  // ("ID 5992 AIRCRAFT LEASING") is not an address: keep the whole first clause when the cut leaves a stub.
  const clause = s.split(",")[0].trim();
  s = clause.split(/\s+(?:[A-Z]{2}\s+)?(?=\d{3,})| (?:FOURTH|THIRD|SECOND|FIRST|GROUND) FLOOR/i)[0].trim();
  if (s.length < 3) s = clause;
  if (!s || /^(-+|same as.*|msn|n\.?a\.?|nil|none|not applicable)$/i.test(s)) return null;
  return s;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Llc|Dac|Ltd|Pvt|Bv|Ifsc|Gmbh|Plc|Lp|Usa|Uk)\b/g, (m) => m.toUpperCase())
    .replace(/\b(Of|And|The|For)\b/g, (m) => m.toLowerCase());
}

export interface OwnerName {
  slug: string;
  name: string;
  trustee: boolean;
}

export function ownerName(raw: string | null | undefined): OwnerName | null {
  if (!raw) return null;
  const cleaned = cleanOwner(raw);
  if (!cleaned) return null;
  const family = FAMILIES.find(([re]) => re.test(cleaned));
  const name = family
    ? family[1]
    : titleCase(
        cleaned
          .replace(/\b(PRIVATE|PVT\.?)\s+(LIMITED|LTD\.?)\b/gi, "")
          .replace(/\b(LIMITED|LTD\.?|DESIGNATED ACTIVITY COMPANY|DAC)\b\.?/gi, "")
          .replace(/\s+/g, " ")
          .trim(),
      );
  return { slug: slugify(name), name, trustee: TRUSTEE.test(cleaned) };
}

export interface OwnerGroup {
  slug: string;
  name: string;
  trustee: boolean;
  owned: Aircraft[];
  leased: Aircraft[];
  archived: ArchivedAircraft[];
  operators: Array<{ id: string; name: string; count: number }>;
  spvs: string[];
}

let ownerCache: OwnerGroup[] | undefined;

export function getOwners(): OwnerGroup[] {
  if (ownerCache) return ownerCache;
  const map = new Map<string, OwnerGroup>();
  const group = (o: OwnerName) => {
    const g = map.get(o.slug) ?? { slug: o.slug, name: o.name, trustee: o.trustee, owned: [], leased: [], archived: [], operators: [], spvs: [] };
    map.set(o.slug, g);
    return g;
  };
  const spv = (g: OwnerGroup, raw: string) => {
    const c = cleanOwner(raw);
    if (c && !g.spvs.includes(c)) g.spvs.push(c);
  };
  for (const a of getAircraft()) {
    const own = ownerName(a.history?.owner);
    const les = ownerName(a.history?.lessor);
    if (own) {
      const g = group(own);
      g.owned.push(a);
      spv(g, a.history!.owner!);
    }
    if (les && les.slug !== own?.slug) {
      const g = group(les);
      g.leased.push(a);
      spv(g, a.history!.lessor!);
    }
  }
  for (const a of getArchive()) {
    const own = ownerName(a.owner);
    if (own) {
      const g = group(own);
      g.archived.push(a);
    }
  }
  for (const g of map.values()) {
    const ops = new Map<string, { id: string; name: string; count: number }>();
    for (const a of [...g.owned, ...g.leased]) {
      const o = ops.get(a.operatorId) ?? { id: a.operatorId, name: a.operator, count: 0 };
      o.count += 1;
      ops.set(a.operatorId, o);
    }
    g.operators = [...ops.values()].sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
    g.owned.sort((x, y) => x.reg.localeCompare(y.reg));
    g.leased.sort((x, y) => x.reg.localeCompare(y.reg));
    g.spvs.sort();
  }
  ownerCache = [...map.values()].sort(
    (x, y) => y.owned.length + y.leased.length - (x.owned.length + x.leased.length) || x.name.localeCompare(y.name),
  );
  return ownerCache;
}

export function getOwner(slug: string): OwnerGroup | undefined {
  return getOwners().find((o) => o.slug === slug);
}

/** Owners with current aircraft, other than the operators themselves: the leasing market. */
export function getLessorLeague(): OwnerGroup[] {
  const operatorSlugs = new Set(getOperators().map((o) => slugify(o.name)));
  return getOwners().filter((g) => {
    const fleet = [...g.owned, ...g.leased];
    if (fleet.length === 0 || operatorSlugs.has(g.slug)) return false;
    // An operator registering its own aircraft is not a lessor.
    const self = fleet.filter((a) => ownerName(a.operatorLegal)?.slug === g.slug).length;
    return self * 2 < fleet.length;
  });
}

// ---------------------------------------------------------------------------------------------
// Register movement by year, from DGCA's registration and deregistration reports.

export function registerByYear(): Array<{ year: number; registered: number; deregistered: number }> {
  const rows = new Map<number, { year: number; registered: number; deregistered: number }>();
  const seen = new Set<string>();
  for (const e of getEvents()) {
    if ((e.kind !== "registered" && e.kind !== "deregistered") || !e.date || !e.reg) continue;
    const key = `${e.kind}|${e.reg}|${e.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const year = Number(e.date.slice(0, 4));
    const r = rows.get(year) ?? { year, registered: 0, deregistered: 0 };
    r[e.kind] += 1;
    rows.set(year, r);
  }
  return [...rows.values()].sort((x, y) => x.year - y.year);
}

export function enrichmentOf(reg: string): Enrichment | undefined {
  return getEnrichment(reg);
}

/** Owner pages exist only for owners of aircraft on a permit today, never for private individuals in the archive. */
export function getOwnerPages(): OwnerGroup[] {
  return getOwners().filter((o) => o.owned.length + o.leased.length > 0);
}

export function hasOwnerPage(slug: string): boolean {
  return getOwnerPages().some((o) => o.slug === slug);
}

// ---------------------------------------------------------------------------------------------
// A to Z register: every registration with a page, grouped by the first letter after "VT-".
// Plain server-rendered links, so crawlers reach every aircraft page without running the explorer.

export interface RegisterEntry {
  reg: string;
  type: string;
  detail: string;
  current: boolean;
}

const ARCHIVE_DETAIL: Record<ArchivedAircraft["status"], string> = {
  deregistered: "Deregistered",
  "off-permit": "Off permit",
  "register-only": "Indian register",
  training: "Flying school",
};

let registerCache: Map<string, RegisterEntry[]> | undefined;

export function getRegister(): Map<string, RegisterEntry[]> {
  if (registerCache) return registerCache;
  const entries: RegisterEntry[] = [
    ...getAircraft().map((a) => ({ reg: a.reg, type: a.type.name, detail: a.operator, current: true })),
    ...getArchive().map((h) => ({
      reg: h.reg,
      type: h.type.name,
      detail: h.training?.fto ?? (h.stints.at(-1) ? `${ARCHIVE_DETAIL[h.status]}, ex-${h.stints.at(-1)!.operator}` : ARCHIVE_DETAIL[h.status]),
      current: false,
    })),
  ].sort((x, y) => x.reg.localeCompare(y.reg));
  registerCache = new Map();
  for (const e of entries) {
    const letter = e.reg.charAt(3).toLowerCase();
    if (!/^[a-z0-9]$/.test(letter)) continue;
    const list = registerCache.get(letter) ?? [];
    list.push(e);
    registerCache.set(letter, list);
  }
  return registerCache;
}
