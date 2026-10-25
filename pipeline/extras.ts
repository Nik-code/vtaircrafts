// Derived datasets that sit beside the monthly build: the archive of registrations that are no
// longer on an operator permit, and per-registration enrichment (engine, build year, serial)
// from DGCA model strings and VRS standing-data (CC0).
// Usage: npx tsx pipeline/extras.ts   (after build.ts has written data/latest)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classifyModel, type TypeInfo } from "./lib/normalize";
import { normalizeReportType } from "./history/events";
import { getBuffer } from "./history/http";

const LATEST = join("data", "latest");
const VRS = "https://raw.githubusercontent.com/vradarserver/standing-data/main";

type Category = "scheduled" | "non-scheduled";

interface Event {
  kind: "registered" | "deregistered" | "owner-change" | "added" | "removed" | "moved" | "snapshot";
  reg: string | null;
  date: string | null;
  from: string | null;
  to: string | null;
  list: Category | null;
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
  source: { kind: "dgca" | "wayback" | "report"; file: string; url: string | null };
}

interface CurrentAircraft {
  reg: string;
  hex: string | null;
  operatorId: string;
  model: string;
  type: TypeInfo;
  history?: { msn: string | null; yearOfManufacture: number | null } | null;
}

interface CurrentOperator {
  id: string;
  name: string;
}

/** A stretch of time a registration spent on one operator's permit; ends are snapshot intervals. */
export interface Stint {
  operatorId: string;
  operator: string;
  list: Category;
  start: { from: string | null; to: string };
  end: { from: string; to: string } | null;
}

export interface ArchivedAircraft {
  reg: string;
  model: string | null;
  type: TypeInfo;
  msn: string | null;
  owner: string | null;
  lessor: string | null;
  registeredOn: string | null;
  deregisteredOn: string | null;
  stints: Stint[];
  training: { ftoId: string; fto: string; asOn: string } | null;
  status: "deregistered" | "off-permit" | "register-only" | "training";
}

interface TrainingList {
  asOn: string;
  ftos: Array<{ id: string; name: string; aircraft: Array<{ reg: string; model: string; type: TypeInfo }> }>;
}

export interface PastOperator {
  id: string;
  name: string;
  lists: Category[];
  regs: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface Enrichment {
  engine: string | null;
  engineSource: "model" | "type" | null;
  builtYear: number | null;
  msn: string | null;
  vrsModel: string | null;
}

export interface TypeSpec {
  icao: string;
  engines: number | null;
  engineKind: "jet" | "turboprop" | "piston" | "electric" | null;
  wake: "L" | "M" | "H" | "J" | null;
}

const read = <T>(name: string): T => JSON.parse(readFileSync(join(LATEST, name), "utf8")) as T;

// ---------------------------------------------------------------------------------------------
// Operator ids: older list captures print legal suffixes that today's slugs drop.

const SUFFIX = new Set(["pvt", "p", "private", "provate", "ltd", "limited", "and", "the", "co", "company"]);
const stem = (id: string) => id.split("-").filter((t) => !SUFFIX.has(t)).join("-");

function operatorResolver(current: CurrentOperator[]) {
  const byStem = new Map<string, string>();
  for (const o of current) byStem.set(stem(o.id), o.id);
  const known = new Set(current.map((o) => o.id));
  return (id: string) => (known.has(id) ? id : byStem.get(stem(id)) ?? stem(id));
}

// ---------------------------------------------------------------------------------------------
// Engines. Airbus single-aisle model numbers encode the engine in the middle digit of the
// variant (A320-251N: 5 = CFM LEAP-1A). Types with one engine option need no lookup.

const AIRBUS_ENGINE: Record<string, string> = {
  "1": "CFM International CFM56",
  "3": "IAE V2500",
  "5": "CFM International LEAP-1A",
  "7": "Pratt & Whitney PW1100G",
};

const TYPE_ENGINE: Record<string, string> = {
  B38M: "CFM International LEAP-1B",
  B39M: "CFM International LEAP-1B",
  B738: "CFM International CFM56-7B",
  B77W: "GE Aerospace GE90-115B",
  A359: "Rolls-Royce Trent XWB",
  A35K: "Rolls-Royce Trent XWB",
  AT76: "Pratt & Whitney Canada PW127",
  AT46: "Pratt & Whitney Canada PW127",
  DH8D: "Pratt & Whitney Canada PW150A",
  E75L: "GE Aerospace CF34-8E",
  E190: "GE Aerospace CF34-10E",
  C208: "Pratt & Whitney Canada PT6A",
  PC12: "Pratt & Whitney Canada PT6A",
  DHC6: "Pratt & Whitney Canada PT6A",
};

function engineFor(model: string | null, icao: string | null): Pick<Enrichment, "engine" | "engineSource"> {
  const m = model?.match(/A3(?:19|20|21)[\s-]?\d(\d)\d/i);
  if (m && AIRBUS_ENGINE[m[1]]) return { engine: AIRBUS_ENGINE[m[1]], engineSource: "model" };
  if (icao && TYPE_ENGINE[icao]) return { engine: TYPE_ENGINE[icao], engineSource: "type" };
  return { engine: null, engineSource: null };
}

// ---------------------------------------------------------------------------------------------
// VRS standing-data: aircraft by Mode S block (India is 800000-83FFFF) and model types.

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const head = splitCsvLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitCsvLine(l);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function vrsCsv(path: string): Promise<Array<Record<string, string>>> {
  const buf = await getBuffer(`${VRS}/${path}`, { delay: 150, softFail: [404] });
  return buf ? parseCsv(buf.toString("utf8")) : [];
}

async function loadVrsAircraft(): Promise<Map<string, Record<string, string>>> {
  const byReg = new Map<string, Record<string, string>>();
  const listing = await getBuffer("https://api.github.com/repos/vradarserver/standing-data/contents/aircraft/schema-01/8", { delay: 0 });
  const dirs = (JSON.parse(listing?.toString("utf8") ?? "[]") as Array<{ name: string; type: string }>)
    .filter((d) => d.type === "dir" && /^8[0-3]$/i.test(d.name));
  for (const dir of dirs) {
    const files = await getBuffer(`https://api.github.com/repos/vradarserver/standing-data/contents/aircraft/schema-01/8/${dir.name}`, { delay: 0 });
    for (const f of JSON.parse(files?.toString("utf8") ?? "[]") as Array<{ name: string }>) {
      for (const row of await vrsCsv(`aircraft/schema-01/8/${dir.name}/${f.name}`)) {
        if (row.Registration?.startsWith("VT-")) byReg.set(row.Registration, row);
      }
    }
  }
  return byReg;
}

const ENGINE_KIND: Record<string, TypeSpec["engineKind"]> = { J: "jet", T: "turboprop", P: "piston", E: "electric" };

async function loadTypeSpecs(icaos: string[]): Promise<TypeSpec[]> {
  const letters = [...new Set(icaos.map((c) => c[0]))].sort();
  const rows: Array<Record<string, string>> = [];
  for (const l of letters) rows.push(...(await vrsCsv(`model-type/schema-01/${l}.csv`)));
  const out: TypeSpec[] = [];
  for (const icao of icaos) {
    const r = rows.find((x) => x.ICAO === icao && x.IsActive === "1") ?? rows.find((x) => x.ICAO === icao);
    if (!r) continue;
    const engines = Number.parseInt(r.Engines, 10);
    out.push({
      icao,
      engines: Number.isFinite(engines) ? engines : null,
      engineKind: ENGINE_KIND[r.EngineTypeCode] ?? null,
      wake: (["L", "M", "H", "J"].includes(r.WakeTurbulenceCode) ? r.WakeTurbulenceCode : null) as TypeSpec["wake"],
    });
  }
  return out;
}

const cleanSerial = (s: string | undefined, reg: string) => {
  const v = (s ?? "").trim();
  return v && v !== reg && /\d/.test(v) ? v : null;
};

// ---------------------------------------------------------------------------------------------

function stintsFor(events: Event[], resolve: (id: string) => string): Stint[] {
  const list = events
    .filter((e) => e.kind === "added" || e.kind === "removed" || e.kind === "moved")
    .sort((a, b) => (a.to ?? "").localeCompare(b.to ?? ""));
  const stints: Stint[] = [];
  const open = new Map<Category, Stint>();
  for (const e of list) {
    const cat = e.list as Category;
    const close = (s: Stint | undefined) => {
      if (s && !s.end) s.end = { from: e.from ?? e.to!, to: e.to! };
    };
    if (e.kind === "added" && e.operatorId) {
      close(open.get(cat));
      const s: Stint = { operatorId: resolve(e.operatorId), operator: e.operator!, list: cat, start: { from: e.from, to: e.to! }, end: null };
      stints.push(s);
      open.set(cat, s);
    } else if (e.kind === "removed") {
      close(open.get(cat));
      open.delete(cat);
    } else if (e.kind === "moved" && e.toOperatorId) {
      close(open.get(cat));
      const s: Stint = { operatorId: resolve(e.toOperatorId), operator: e.toOperator!, list: cat, start: { from: e.from, to: e.to! }, end: null };
      stints.push(s);
      open.set(cat, s);
    }
  }
  return stints;
}

// Old lists and reports print types loosely ("AIRBUS 330", "BOEING 777 337 ER", "800").
const GENERIC = new Set(["Boeing 737", "Learjet", "Piper", "Bell helicopter", "Cessna Citation", "Gulfstream", "Dassault Falcon", "Beechcraft King Air"]);

function rank(t: TypeInfo, raw: string): number {
  if (t.icao && !GENERIC.has(t.name)) return 3;
  if (t.icao || GENERIC.has(t.name)) return 2;
  if (!t.manufacturer.startsWith("Other") && t.name !== raw) return 1;
  return 0;
}

function bestModel(events: Event[]): { model: string | null; type: TypeInfo } {
  // Newest first: list captures by interval end, reports by date.
  const candidates = events
    .flatMap((e) => {
      const when = e.date ?? e.to ?? "";
      const out: Array<{ raw: string; when: string }> = [];
      if (e.source.kind !== "report" && e.model) out.push({ raw: e.model, when });
      if (e.type) out.push({ raw: e.type, when });
      return out;
    })
    .sort((a, b) => b.when.localeCompare(a.when));
  let best: { model: string; type: TypeInfo; score: number } | null = null;
  for (const c of candidates) {
    const cleaned = normalizeReportType(c.raw)
      .replace(/(\d{3})\s+(\d{3})\b/g, "$1-$2")
      .replace(/\bA-(3\d\d)/gi, "A$1");
    const type = classifyModel(cleaned, null);
    const score = rank(type, cleaned);
    if (!best || score > best.score) best = { model: c.raw, type, score };
    if (score === 3) break;
  }
  if (best) return { model: best.model, type: best.type };
  return { model: null, type: classifyModel("Unknown", null) };
}

async function main() {
  const aircraft = read<CurrentAircraft[]>("aircraft.json");
  const operators = read<CurrentOperator[]>("operators.json");
  const events = read<Event[]>("events.json");
  const resolve = operatorResolver(operators);
  const current = new Set(aircraft.map((a) => a.reg));

  const byReg = new Map<string, Event[]>();
  for (const e of events) {
    if (!e.reg) continue;
    if (!byReg.has(e.reg)) byReg.set(e.reg, []);
    byReg.get(e.reg)!.push(e);
  }

  const archive: ArchivedAircraft[] = [];
  for (const [reg, evs] of byReg) {
    if (current.has(reg)) continue;
    const reports = evs.filter((e) => e.source.kind === "report").sort((a, b) => (a.date ?? a.to ?? "").localeCompare(b.date ?? b.to ?? ""));
    const last = <K extends keyof Event>(k: K) => [...reports].reverse().find((e) => e[k])?.[k] ?? null;
    const registeredOn = [...reports].reverse().find((e) => e.kind === "registered" && e.date)?.date ?? null;
    const deregisteredOn = [...reports].reverse().find((e) => e.kind === "deregistered" && e.date)?.date ?? null;
    const stints = stintsFor(evs, resolve);
    const { model, type } = bestModel(evs);
    const deregistered = deregisteredOn != null && (registeredOn == null || deregisteredOn >= registeredOn);
    archive.push({
      reg,
      model,
      type,
      msn: (last("msn") as string | null)?.trim() || null,
      owner: (last("owner") as string | null)?.trim() || null,
      lessor: (last("lessor") as string | null)?.trim() || null,
      registeredOn,
      deregisteredOn,
      stints,
      training: null,
      status: deregistered ? "deregistered" : stints.length ? "off-permit" : "register-only",
    });
  }

  // Aircraft on the flying training organisations list hold no operator permit either.
  const trainingPath = join(LATEST, "training.json");
  if (existsSync(trainingPath)) {
    const training = JSON.parse(readFileSync(trainingPath, "utf8")) as TrainingList;
    const byArchive = new Map(archive.map((a) => [a.reg, a]));
    for (const fto of training.ftos) {
      for (const t of fto.aircraft) {
        if (current.has(t.reg)) continue;
        const listed = { ftoId: fto.id, fto: fto.name, asOn: training.asOn };
        const a = byArchive.get(t.reg);
        if (a) {
          a.training ??= listed;
          if (a.status !== "deregistered") a.status = "training";
          if (!a.type.icao && t.type.icao) a.type = t.type;
          continue;
        }
        const record: ArchivedAircraft = {
          reg: t.reg,
          model: t.model,
          type: t.type,
          msn: null,
          owner: null,
          lessor: null,
          registeredOn: null,
          deregisteredOn: null,
          stints: [],
          training: listed,
          status: "training",
        };
        archive.push(record);
        byArchive.set(t.reg, record);
      }
    }
  }
  archive.sort((a, b) => a.reg.localeCompare(b.reg));

  // Operators that appear in old list captures but hold no permit today.
  const currentIds = new Set(operators.map((o) => o.id));
  const past = new Map<string, PastOperator>();
  for (const e of events) {
    if (e.source.kind === "report" || !e.reg || !e.list) continue;
    const pairs: Array<[string | undefined, string | undefined]> = [
      [e.operatorId, e.operator],
      [e.fromOperatorId, e.fromOperator],
      [e.toOperatorId, e.toOperator],
    ];
    for (const [rawId, name] of pairs) {
      if (!rawId || !name) continue;
      const id = resolve(rawId);
      if (currentIds.has(id)) continue;
      const p = past.get(id) ?? { id, name, lists: [], regs: [], firstSeen: e.to!, lastSeen: e.to! };
      if (!p.lists.includes(e.list)) p.lists.push(e.list);
      if (!p.regs.includes(e.reg)) p.regs.push(e.reg);
      if (e.from && e.from < p.firstSeen) p.firstSeen = e.from;
      if (e.to! < p.firstSeen) p.firstSeen = e.to!;
      const seen = e.kind === "removed" ? e.from ?? e.to! : e.to!;
      if (seen > p.lastSeen) p.lastSeen = seen;
      past.set(id, p);
    }
  }
  const pastOperators = [...past.values()].map((p) => ({ ...p, regs: p.regs.sort() })).sort((a, b) => b.regs.length - a.regs.length || a.name.localeCompare(b.name));

  // Enrichment for every registration with a page.
  console.log("fetching VRS standing-data …");
  const vrs = await loadVrsAircraft();
  const enrich: Record<string, Enrichment> = {};
  for (const a of aircraft) {
    // Registrations are reused, so a VRS row only describes this airframe when the type agrees.
    const row = vrs.get(a.reg);
    const v = row && (!a.type.icao || !row.ModelICAO || row.ModelICAO === a.type.icao) ? row : undefined;
    const built = Number.parseInt(v?.YearBuilt ?? "", 10);
    enrich[a.reg] = {
      ...engineFor(a.model, a.type.icao),
      builtYear: Number.isFinite(built) ? built : null,
      msn: a.history?.msn ? null : cleanSerial(v?.SerialNumber, a.reg),
      vrsModel: v?.Model || null,
    };
    if (!enrich[a.reg].engine && v?.Model) Object.assign(enrich[a.reg], engineFor(`${v.ManufacturerAndModel}`.replace(/\s/g, "-"), a.type.icao));
  }
  for (const a of archive) {
    const e = engineFor(a.model, a.type.icao);
    if (e.engine) enrich[a.reg] = { ...e, builtYear: null, msn: null, vrsModel: null };
  }

  const icaos = [...new Set([...aircraft.map((a) => a.type.icao), ...archive.map((a) => a.type.icao)].filter((x): x is string => !!x))];
  const specs = await loadTypeSpecs(icaos.map((c) => (c === "MI17" ? "MI8" : c)));
  for (const s of specs) if (s.icao === "MI8") s.icao = "MI17";

  writeFileSync(join(LATEST, "archive.json"), JSON.stringify(archive));
  writeFileSync(join(LATEST, "past-operators.json"), JSON.stringify(pastOperators));
  writeFileSync(join(LATEST, "enrich.json"), JSON.stringify(enrich));
  writeFileSync(join(LATEST, "type-specs.json"), JSON.stringify(specs, null, 1));

  const filled = (k: keyof Enrichment) => Object.values(enrich).filter((e) => e[k] != null).length;
  const count = (s: ArchivedAircraft["status"]) => archive.filter((a) => a.status === s).length;
  console.log(`archive ${archive.length} (${count("deregistered")} deregistered, ${count("off-permit")} off permit, ${count("training")} flying school, ${count("register-only")} register only)`);
  console.log(`past operators ${pastOperators.length}; VRS rows ${vrs.size}; enrich engine ${filled("engine")}, built ${filled("builtYear")}, msn ${filled("msn")}; type specs ${specs.length}/${icaos.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
