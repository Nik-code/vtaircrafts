// Turn the snapshot chain and the DGCA registration reports into the event log.
//
// Two kinds of dating are possible and both are kept distinct:
//   * exact  - the reports print a date per airframe (registered / deregistered / owner-change)
//   * interval - a registration that appears or disappears between two operator-list snapshots
//     only tells you it happened somewhere in that window, so those events carry from/to.
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { classifyModel, identifyOperator, type TypeInfo } from "../lib/normalize";
import type { RawAircraft, RawOperator } from "../lib/types";
import { snapshotChain, type HistorySnapshot } from "./captures";
import { loadReports, type ReportResult, type ReportRow } from "./reports";
import type { ListName } from "./wayback";

export type EventKind =
  | "registered"
  | "deregistered"
  | "owner-change"
  | "added"
  | "removed"
  | "moved"
  | "snapshot";

export interface EventSource {
  kind: "dgca" | "wayback" | "report";
  file: string;
  url: string | null;
}

export interface HistoryEvent {
  id: string;
  kind: EventKind;
  reg: string | null;
  date: string | null;
  from: string | null;
  to: string | null;
  list: ListName | null;
  operator?: string;
  operatorId?: string;
  fromOperator?: string;
  fromOperatorId?: string;
  toOperator?: string;
  toOperatorId?: string;
  model?: string;
  type?: string;
  msn?: string;
  owner?: string;
  lessor?: string;
  source: EventSource;
  note?: string;
}

export interface SnapshotInfo {
  date: string;
  list: ListName;
  source: "dgca" | "wayback";
  url: string | null;
  sha256: string;
  aircraft: number;
  operators: number;
}

export interface AircraftHistory {
  firstSnapshot: string;
  registeredOn: string | null;
  deregisteredOn: string | null;
  msn: string | null;
  yearOfManufacture: number | null;
  owner: string | null;
  lessor: string | null;
}

export interface HistoryBuild {
  events: HistoryEvent[];
  snapshots: SnapshotInfo[];
  /** earliest snapshot in which each registration was ever listed */
  firstSeen: Map<string, string>;
  /** report rows indexed by registration */
  reportsByReg: Map<string, ReportRow[]>;
  counts: Record<string, number>;
}

const LISTS: ListName[] = ["scheduled", "non-scheduled"];

function sha1(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

function eventId(kind: string, reg: string | null, date: string | null, from: string | null, to: string | null, file: string): string {
  return sha1([kind, reg ?? "", date ?? "", from ?? "", to ?? "", file].join("|"));
}

function snapshotSource(s: HistorySnapshot): EventSource {
  return {
    kind: s.source,
    file: s.source === "wayback" ? `wayback/${s.list}/${basename(s.file)}` : basename(s.file),
    url: s.url,
  };
}

interface Holding {
  reg: string;
  operatorId: string;
  operator: string;
  model: string;
  type: string;
}

/**
 * The pre-2018 exports print the operator column narrower, so the same company reads as
 * "Camping Retreats" in one snapshot and "Camping Retreats of India Pvt. Ltd." in the next.
 * Fold an id into a longer one that extends it, but only when the two never appear in the
 * same list on the same day - that is what separates a truncation from a real pair of
 * companies such as air-india and air-india-express.
 */
function resolveTruncatedIds(perSnapshot: Array<Set<string>>): Map<string, string> {
  const all = new Set<string>();
  for (const s of perSnapshot) for (const id of s) all.add(id);
  const ids = [...all].sort();
  const coOccurs = (a: string, b: string) => perSnapshot.some((s) => s.has(a) && s.has(b));
  const canonical = new Map<string, string>();
  for (const short of ids) {
    let best = short;
    for (const long of ids) {
      if (long === short || !long.startsWith(`${short}-`)) continue;
      if (coOccurs(short, long)) continue;
      if (long.length > best.length) best = long;
    }
    canonical.set(short, best);
  }
  // Collapse chains ("camping-retreats" -> "camping-retreats-of" -> "camping-retreats-of-india").
  for (const id of ids) {
    let target = canonical.get(id)!;
    for (let i = 0; i < 8 && canonical.get(target) !== target; i += 1) target = canonical.get(target)!;
    canonical.set(id, target);
  }
  return canonical;
}

function holdings(s: HistorySnapshot, canonical?: Map<string, string>, names?: Map<string, string>): Map<string, Holding> {
  const ops = new Map<number, RawOperator>(s.result.operators.map((o) => [o.seq, o]));
  const out = new Map<string, Holding>();
  for (const a of s.result.aircraft as RawAircraft[]) {
    const op = ops.get(a.operatorSeq);
    const ident = identifyOperator(op?.name ?? "", op?.brandRaw ?? null);
    const id = canonical?.get(ident.id) ?? ident.id;
    const cls = classifyModel(a.model, a.wing);
    out.set(a.reg, { reg: a.reg, operatorId: id, operator: names?.get(id) ?? ident.name, model: a.model, type: cls.name });
  }
  return out;
}

/**
 * A registration that reads as operator A, then B, then A again across three consecutive
 * snapshots almost always means the middle snapshot misread one operator block, not two
 * transfers in a row. Both windows are dropped rather than reported as movements.
 */
function flappingMoves(chain: HistorySnapshot[], held: Array<Map<string, Holding>>): Set<string> {
  const out = new Set<string>();
  const regs = new Set<string>();
  for (const h of held) for (const r of h.keys()) regs.add(r);
  for (const reg of regs) {
    // indices of the snapshots this registration appears in, in order
    const seen: number[] = [];
    for (let i = 0; i < chain.length; i += 1) if (held[i].has(reg)) seen.push(i);
    for (let k = 1; k + 1 < seen.length; k += 1) {
      const [a, b, c] = [seen[k - 1], seen[k], seen[k + 1]];
      // only consecutive snapshots produce move events, so the windows must be adjacent
      if (b !== a + 1 || c !== b + 1) continue;
      const idA = held[a].get(reg)!.operatorId;
      const idB = held[b].get(reg)!.operatorId;
      const idC = held[c].get(reg)!.operatorId;
      if (idA !== idB && idB !== idC && idA === idC) {
        out.add(`${reg}|${b}`);
        out.add(`${reg}|${c}`);
      }
    }
  }
  return out;
}

function operatorIds(s: HistorySnapshot): Set<string> {
  const out = new Set<string>();
  for (const o of s.result.operators) out.add(identifyOperator(o.name, o.brandRaw).id);
  return out;
}

/**
 * The pre-2018 lists print manufacturer names where the modern ones print a designator
 * ("AIRBUS 320-231" vs "A320-231"); fold them together so classifyModel can match.
 */
export function normalizeReportType(t: string): string {
  return t
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\bAIRBUS-?\s*A?\s*(\d)/gi, "A$1")
    .replace(/\bBOEING-?\s*B?\s*(\d)/gi, "B$1")
    .replace(/\bATR-?\s*(\d)/gi, "ATR$1")
    .replace(/\bEMBRAER-?\s*(\d)/gi, "EMB-$1")
    .replace(/\bA\s+(\d{3})/g, "A$1")
    .replace(/\bB\s+(\d{3})/g, "B$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Registrations are reused across airframes, so a 2011 report row only describes today's
 * aircraft when the two are the same kind of machine.
 */
export function typeCompatible(current: TypeInfo, reportType: string | null): boolean {
  if (!reportType) return false;
  const r = classifyModel(normalizeReportType(reportType), null);
  if (current.icao && r.icao) return current.icao === r.icao;
  if (r.manufacturer.startsWith("Other") || current.manufacturer.startsWith("Other")) return false;
  return r.manufacturer === current.manufacturer && r.family === current.family;
}

export function buildHistory(): HistoryBuild {
  const events: HistoryEvent[] = [];
  const snapshots: SnapshotInfo[] = [];
  const firstSeen = new Map<string, string>();

  const chains = new Map<ListName, HistorySnapshot[]>(LISTS.map((l) => [l, snapshotChain(l)]));
  const canonical = resolveTruncatedIds([...chains.values()].flat().map(operatorIds));
  // Display name for a canonical id: the one the newest snapshot spells out.
  const names = new Map<string, string>();
  for (const snap of [...chains.values()].flat().sort((a, b) => a.asOn.localeCompare(b.asOn))) {
    for (const o of snap.result.operators) {
      const ident = identifyOperator(o.name, o.brandRaw);
      names.set(canonical.get(ident.id) ?? ident.id, ident.name);
    }
  }

  for (const list of LISTS) {
    const chain = chains.get(list)!;
    const heldPerSnapshot = chain.map((snap) => holdings(snap, canonical, names));
    const flapping = flappingMoves(chain, heldPerSnapshot);
    let prev: { snap: HistorySnapshot; held: Map<string, Holding> } | null = null;

    for (const [snapIndex, snap] of chain.entries()) {
      const held = heldPerSnapshot[snapIndex];
      for (const reg of held.keys()) {
        const seen = firstSeen.get(reg);
        if (!seen || snap.asOn < seen) firstSeen.set(reg, snap.asOn);
      }
      const src = snapshotSource(snap);
      snapshots.push({
        date: snap.asOn,
        list,
        source: snap.source,
        url: snap.url,
        sha256: snap.sha256,
        aircraft: snap.result.aircraft.length,
        operators: snap.result.operators.length,
      });
      events.push({
        id: eventId("snapshot", null, snap.asOn, null, null, src.file),
        kind: "snapshot",
        reg: null,
        date: snap.asOn,
        from: null,
        to: null,
        list,
        source: src,
        note: `${snap.result.aircraft.length} aircraft, ${snap.result.operators.length} operators`,
      });

      if (prev) {
        const from = prev.snap.asOn;
        const to = snap.asOn;
        for (const [reg, h] of held) {
          const before = prev.held.get(reg);
          if (!before) {
            events.push({
              id: eventId("added", reg, null, from, to, src.file),
              kind: "added",
              reg,
              date: null,
              from,
              to,
              list,
              operator: h.operator,
              operatorId: h.operatorId,
              model: h.model,
              type: h.type,
              source: src,
            });
          } else if (before.operatorId !== h.operatorId) {
            if (flapping.has(`${reg}|${snapIndex}`)) continue;
            events.push({
              id: eventId("moved", reg, null, from, to, src.file),
              kind: "moved",
              reg,
              date: null,
              from,
              to,
              list,
              fromOperator: before.operator,
              fromOperatorId: before.operatorId,
              toOperator: h.operator,
              toOperatorId: h.operatorId,
              model: h.model,
              type: h.type,
              source: src,
            });
          }
        }
        for (const [reg, before] of prev.held) {
          if (held.has(reg)) continue;
          events.push({
            id: eventId("removed", reg, null, from, to, src.file),
            kind: "removed",
            reg,
            date: null,
            from,
            to,
            list,
            operator: before.operator,
            operatorId: before.operatorId,
            model: before.model,
            type: before.type,
            source: src,
          });
        }
      }
      prev = { snap, held };
    }
  }

  // Exact-dated events from the DGCA registration reports.
  const reportsByReg = new Map<string, ReportRow[]>();
  for (const report of loadReports() as ReportResult[]) {
    for (const row of report.rows) {
      const list = reportsByReg.get(row.reg) ?? [];
      list.push(row);
      reportsByReg.set(row.reg, list);
      const kind: EventKind =
        row.kind === "registration" ? "registered" : row.kind === "deregistration" ? "deregistered" : "owner-change";
      const date = row.date;
      if (!date) continue;
      const src: EventSource = { kind: "report", file: row.source.file, url: row.source.url };
      const ev: HistoryEvent = {
        id: eventId(kind, row.reg, date, null, null, src.file),
        kind,
        reg: row.reg,
        date,
        from: null,
        to: null,
        list: null,
        source: src,
      };
      if (row.type) ev.type = row.type;
      if (row.msn) ev.msn = row.msn;
      if (row.owner) ev.owner = row.owner;
      if (row.lessor) ev.lessor = row.lessor;
      if (row.operator) ev.operator = row.operator;
      events.push(ev);
    }
  }
  for (const rows of reportsByReg.values()) rows.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  // Ids must be unique: a handful of report rows are printed twice, and a few describe the
  // same tail on the same day with slightly different lessor wording.
  const byId = new Map<string, HistoryEvent>();
  const unique: HistoryEvent[] = [];
  for (const e of events) {
    const existing = byId.get(e.id);
    if (existing && JSON.stringify(existing) === JSON.stringify(e)) continue;
    if (existing) {
      let n = 2;
      while (byId.has(`${e.id}-${n}`)) n += 1;
      e.id = `${e.id}-${n}`;
    }
    byId.set(e.id, e);
    unique.push(e);
  }
  events.length = 0;
  events.push(...unique);

  // Newest first; a snapshot event sorts with the other events of its own date.
  const key = (e: HistoryEvent) => e.date ?? e.to ?? "";
  const RANK: Record<EventKind, number> = {
    snapshot: 0, registered: 1, deregistered: 2, "owner-change": 3, added: 4, removed: 5, moved: 6,
  };
  events.sort((a, b) => key(b).localeCompare(key(a)) || RANK[a.kind] - RANK[b.kind] || (a.reg ?? "").localeCompare(b.reg ?? ""));
  snapshots.sort((a, b) => b.date.localeCompare(a.date) || a.list.localeCompare(b.list));

  const counts: Record<string, number> = {};
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  return { events, snapshots, firstSeen, reportsByReg, counts };
}

/** What the reports and the snapshot chain can say about one aircraft in today's fleet. */
export function aircraftHistoryFor(
  build: HistoryBuild,
  a: { reg: string; type: TypeInfo },
  fallbackFirstSeen: string,
): AircraftHistory {
  const history: AircraftHistory = {
    firstSnapshot: build.firstSeen.get(a.reg) ?? fallbackFirstSeen,
    registeredOn: null,
    deregisteredOn: null,
    msn: null,
    yearOfManufacture: null,
    owner: null,
    lessor: null,
  };
  const rows = (build.reportsByReg.get(a.reg) ?? []).filter((r) => typeCompatible(a.type, r.type));
  if (!rows.length) return history;

  const registrations = rows.filter((r) => r.kind === "registration" && r.dateOfRegistration);
  const latestReg = registrations.at(-1);
  if (latestReg) {
    history.registeredOn = latestReg.dateOfRegistration;
    history.msn = latestReg.msn;
    history.yearOfManufacture = latestReg.yearOfManufacture;
    history.owner = latestReg.owner;
    history.lessor = latestReg.lessor;
  }
  // The most recent ownership record wins for owner/lessor, registration or change alike.
  const latestParty = rows.filter((r) => r.owner || r.lessor).at(-1);
  if (latestParty) {
    history.owner = latestParty.owner ?? history.owner;
    history.lessor = latestParty.lessor ?? history.lessor;
  }
  if (!history.msn) history.msn = rows.map((r) => r.msn).filter(Boolean).at(-1) ?? null;
  if (!history.yearOfManufacture) {
    history.yearOfManufacture = rows.map((r) => r.yearOfManufacture).filter((y): y is number => y != null).at(-1) ?? null;
  }
  // Only trust a de-registration that came after the registration we matched: an earlier
  // one belongs to a previous airframe that wore the same tail.
  const dereg = rows.filter((r) => r.kind === "deregistration" && r.dateOfDeregistration).at(-1);
  if (dereg?.dateOfDeregistration && (!history.registeredOn || dereg.dateOfDeregistration > history.registeredOn)) {
    history.deregisteredOn = dereg.dateOfDeregistration;
  }
  return history;
}
