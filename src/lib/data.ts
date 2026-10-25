import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Aircraft, ArchivedAircraft, Enrichment, Operator, Meta, Changes, IndexRecord, Event, PastOperator, SnapshotInfo, TrainingList, TypeSpec } from "./types";

const LATEST = join(process.cwd(), "data", "latest");

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(LATEST, name), "utf8")) as T;
}

const cache: {
  aircraft?: Aircraft[];
  operators?: Operator[];
  meta?: Meta;
  changes?: Changes | null;
  index?: IndexRecord[];
  events?: Event[];
  snapshots?: SnapshotInfo[];
  archive?: ArchivedAircraft[];
  pastOperators?: PastOperator[];
  enrich?: Record<string, Enrichment>;
  typeSpecs?: TypeSpec[];
  training?: TrainingList | null;
  byReg?: Map<string, Aircraft>;
  eventsByReg?: Map<string, Event[]>;
} = {};

function readOptional<T>(name: string, fallback: T): T {
  return existsSync(join(LATEST, name)) ? read<T>(name) : fallback;
}

export function getAircraft(): Aircraft[] {
  return (cache.aircraft ??= read<Aircraft[]>("aircraft.json"));
}
export function getOperators(): Operator[] {
  return (cache.operators ??= read<Operator[]>("operators.json"));
}
export function getMeta(): Meta {
  return (cache.meta ??= read<Meta>("meta.json"));
}
export function getChanges(): Changes | null {
  if (cache.changes === undefined) {
    cache.changes = existsSync(join(LATEST, "changes.json")) ? read<Changes>("changes.json") : null;
  }
  return cache.changes;
}
export function getIndex(): IndexRecord[] {
  return (cache.index ??= read<IndexRecord[]>("index.json"));
}
export function getAircraftByReg(reg: string): Aircraft | undefined {
  cache.byReg ??= new Map(getAircraft().map((a) => [a.reg, a]));
  return cache.byReg.get(reg);
}
export function getOperator(id: string): Operator | undefined {
  return getOperators().find((o) => o.id === id);
}

export function getEvents(): Event[] {
  if (!cache.events) cache.events = existsSync(join(LATEST, "events.json")) ? read<Event[]>("events.json") : [];
  return cache.events;
}
export function getSnapshots(): SnapshotInfo[] {
  if (!cache.snapshots) cache.snapshots = existsSync(join(LATEST, "snapshots.json")) ? read<SnapshotInfo[]>("snapshots.json") : [];
  return cache.snapshots;
}

export function getEventsFor(reg: string): Event[] {
  if (!cache.eventsByReg) {
    cache.eventsByReg = new Map();
    for (const e of getEvents()) {
      if (!e.reg) continue;
      const list = cache.eventsByReg.get(e.reg) ?? [];
      list.push(e);
      cache.eventsByReg.set(e.reg, list);
    }
  }
  return cache.eventsByReg.get(reg) ?? [];
}

export function getArchive(): ArchivedAircraft[] {
  return (cache.archive ??= readOptional<ArchivedAircraft[]>("archive.json", []));
}
export function getArchivedByReg(reg: string): ArchivedAircraft | undefined {
  return getArchive().find((a) => a.reg === reg);
}
export function getPastOperators(): PastOperator[] {
  return (cache.pastOperators ??= readOptional<PastOperator[]>("past-operators.json", []));
}
export function getPastOperator(id: string): PastOperator | undefined {
  return getPastOperators().find((o) => o.id === id);
}
export function getEnrichment(reg: string): Enrichment | undefined {
  return (cache.enrich ??= readOptional<Record<string, Enrichment>>("enrich.json", {}))[reg];
}
export function getTypeSpec(icao: string | null): TypeSpec | undefined {
  if (!icao) return undefined;
  return (cache.typeSpecs ??= readOptional<TypeSpec[]>("type-specs.json", [])).find((t) => t.icao === icao);
}
export function getTraining(): TrainingList | null {
  if (cache.training === undefined) cache.training = readOptional<TrainingList | null>("training.json", null);
  return cache.training;
}
