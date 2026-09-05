import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Aircraft, Operator, Meta, Changes, IndexRecord } from "./types";

const LATEST = join(process.cwd(), "data", "latest");

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(LATEST, name), "utf8")) as T;
}

let cache: { aircraft?: Aircraft[]; operators?: Operator[]; meta?: Meta; changes?: Changes | null; index?: IndexRecord[] } = {};

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
  return getAircraft().find((a) => a.reg === reg);
}
export function getOperator(id: string): Operator | undefined {
  return getOperators().find((o) => o.id === id);
}
