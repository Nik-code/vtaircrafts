import { getAircraft, getEvents, getMeta, getOperators } from "@/lib/data";
import type { Aircraft, Event, Operator } from "@/lib/types";
import type { ApronGroup } from "./apron";

/** Aircraft of one operator, in registration order. */
function fleetByOperator(aircraft: Aircraft[]) {
  const m = new Map<string, Aircraft[]>();
  for (const a of aircraft) {
    const list = m.get(a.operatorId);
    if (list) list.push(a);
    else m.set(a.operatorId, [a]);
  }
  for (const list of m.values()) list.sort((x, y) => (x.reg < y.reg ? -1 : 1));
  return m;
}

/** Operators largest first, ties broken by name so the sheet is reproducible. */
export function operatorsBySize(operators: Operator[] = getOperators()) {
  return [...operators].sort((a, b) => b.fleetCount - a.fleetCount || a.name.localeCompare(b.name));
}

/** Every aircraft, parked by operator, ready for the apron chart. */
export function apronGroups(): ApronGroup[] {
  const fleets = fleetByOperator(getAircraft());
  return operatorsBySize()
    .map((o) => ({
      id: o.id,
      name: o.name,
      scheduled: o.category === "scheduled",
      aircraft: (fleets.get(o.id) ?? []).map((a) => ({ reg: a.reg, type: a.type.name, wing: a.wing })),
    }))
    .filter((g) => g.aircraft.length > 0);
}

export interface TypeRow {
  name: string;
  icao: string | null;
  manufacturer: string;
  count: number;
}

/** Types largest first. */
export function typeRows(): TypeRow[] {
  const m = new Map<string, TypeRow>();
  for (const a of getAircraft()) {
    const row = m.get(a.type.name);
    if (row) row.count += 1;
    else m.set(a.type.name, { name: a.type.name, icao: a.type.icao, manufacturer: a.type.manufacturer, count: 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Distinct type names on the lists. */
export function typeCount() {
  return new Set(getAircraft().map((a) => a.type.name)).size;
}

export function seatsTotal() {
  return getOperators().reduce((n, o) => n + o.seatsTotal, 0);
}

export interface Expiry {
  id: string;
  name: string;
  scheduled: boolean;
  date: string;
}

/**
 * Operator permits falling due within `months` of the snapshot. Anchored to the
 * snapshot rather than to the clock so a rebuild of the same data draws the
 * same sheet.
 */
export function permitHorizon(months = 30) {
  const snapshot = getMeta().snapshot;
  const [y, m] = snapshot.split("-").map(Number);
  const start = Date.UTC(y, m, 1); // first day of the month after the snapshot
  const end = Date.UTC(y, m + months, 1);
  const expiries: Expiry[] = operatorsBySize()
    .filter((o) => o.permit.validUntil)
    .map((o) => ({ id: o.id, name: o.name, scheduled: o.category === "scheduled", date: o.permit.validUntil as string }))
    .filter((e) => {
      const t = Date.parse(`${e.date}T00:00:00Z`);
      return t >= start && t < end;
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
  return { start, end, months, expiries };
}

const MOVEMENT_KINDS = new Set(["added", "registered", "moved", "removed", "deregistered"]);

/**
 * The most recent movements. Every event in a snapshot shares one timestamp, so
 * the newest batch is dealt out kind by kind: the reader sees what actually
 * changed rather than eight consecutive deliveries to one airline.
 */
export function recentMovements(limit = 8): Event[] {
  const events = getEvents().filter((e) => MOVEMENT_KINDS.has(e.kind) && e.reg);
  if (events.length <= limit) return events;
  const stamp = (e: Event) => e.date ?? e.to ?? "";
  const newest = stamp(events[0]);
  const batch = events.filter((e) => stamp(e) === newest);
  const rest = events.filter((e) => stamp(e) !== newest);
  const lanes = new Map<string, Event[]>();
  for (const e of batch) {
    const lane = lanes.get(e.kind);
    if (lane) lane.push(e);
    else lanes.set(e.kind, [e]);
  }
  const out: Event[] = [];
  let drained = false;
  while (out.length < limit && !drained) {
    drained = true;
    for (const lane of lanes.values()) {
      const next = lane.shift();
      if (!next) continue;
      drained = false;
      out.push(next);
      if (out.length === limit) break;
    }
  }
  return out.concat(rest).slice(0, limit);
}

/**
 * Six photographed tails for the plate strip: one per operator, no repeated
 * type, largest operators first. Only exact matches for the registration.
 */
export function plateSelection(count = 6): Aircraft[] {
  const fleets = fleetByOperator(getAircraft());
  const seenType = new Set<string>();
  const out: Aircraft[] = [];
  for (const o of operatorsBySize()) {
    const pick = (fleets.get(o.id) ?? []).find((a) => a.image?.tier === "exact" && !seenType.has(a.type.name));
    if (!pick) continue;
    seenType.add(pick.type.name);
    out.push(pick);
    if (out.length === count) break;
  }
  return out;
}
