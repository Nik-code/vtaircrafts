// Assemble the public dataset for one snapshot from parsed JSON + enrichment + image cache.
// Usage: npx tsx pipeline/build.ts 2026-08-31 [--previous 2024-06-10]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeType, classifyModel, identifyOperator, manufacturerFromIcao, roleFromSeating } from "./lib/normalize";
import { loadHexDatabase } from "./lib/enrich";
import { parseSeats } from "./lib/text";
import type { ParseResult } from "./lib/types";
import type { CommonsImage } from "./images";
import { assignImages, type ImageCache } from "./lib/assignImages";
import { aircraftHistoryFor, buildHistory, type AircraftHistory } from "./history/events";

export type Wing = "FW" | "RW" | "B";
export type ImageTier = "exact" | "operator-type" | "type" | "type-world";

export interface Aircraft {
  reg: string;
  hex: string | null;
  operatorId: string;
  operator: string;
  operatorLegal: string;
  category: "scheduled" | "non-scheduled";
  permit: { no: string | null; validUntil: string | null };
  model: string;
  type: { icao: string | null; manufacturer: string; family: string; name: string };
  wing: Wing;
  seats: number | null;
  seatsRaw: string | null;
  role: "passenger" | "cargo" | "aerial-work" | "mixed" | "unknown";
  image: (CommonsImage & { tier: ImageTier; ofReg: string | null }) | null;
  source: { file: string; asOn: string; page: number };
  firstSeen: string;
  history: AircraftHistory;
}

export interface Operator {
  id: string;
  name: string;
  legalName: string;
  category: "scheduled" | "non-scheduled";
  website: string | null;
  permit: { no: string | null; validUntil: string | null };
  ops: string | null;
  fleetCount: number;
  statedCount: number | null;
  types: Array<{ name: string; icao: string | null; manufacturer: string; count: number }>;
  wings: Record<Wing, number>;
  seatsTotal: number;
  heroReg: string | null;
}

const snapshot = process.argv[2];
if (!snapshot) throw new Error("usage: build.ts <snapshot> [--previous <snapshot>]");
const prevIdx = process.argv.indexOf("--previous");
const previous = prevIdx > 0 ? process.argv[prevIdx + 1] : null;

const parsedDir = join("data", "parsed", snapshot);
const rawDir = join("data", "raw", snapshot);
const outDir = join("data", "snapshots", snapshot);
mkdirSync(outDir, { recursive: true });

const results: ParseResult[] = readdirSync(parsedDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(parsedDir, f), "utf8")));

const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

async function main() {
  const hexDb = await loadHexDatabase(join("data", "raw", "aircraft.csv.gz"));
  const cachePath = join("data", "cache", "commons", "exact.json");
  const imageCache: Record<string, { checkedAt: string; image: CommonsImage | null; category: boolean }> = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf8"))
    : {};

  // The whole recorded history: the archived DGCA list snapshots plus the registration
  // reports. `firstSeen` is the earliest snapshot a registration appears in, anywhere in
  // that chain, which is why it can predate this repo's own first fetch.
  const history = buildHistory();
  console.error(`history: ${JSON.stringify(history.counts)} across ${history.snapshots.length} snapshots`);

  const aircraft: Aircraft[] = [];
  const operators = new Map<string, Operator>();
  const issues: Array<{ level: string; message: string; category: string }> = [];

  for (const r of results) {
    const file = r.category === "scheduled" ? "sch-oper.pdf" : "ns-oper.pdf";
    for (const i of r.issues) if (!/Re-joined|overlay/.test(i.message)) issues.push({ ...i, category: r.category });
    for (const raw of r.aircraft) {
      const ident = identifyOperator(raw.operatorName, raw.operatorBrandRaw);
      const hexRec = hexDb.get(raw.reg) ?? null;
      const cls = classifyModel(raw.model, raw.wing);
      const icao = cls.icao ?? hexRec?.icaoType ?? null;
      const manufacturer = cls.manufacturer !== "Other" && cls.manufacturer !== "Other helicopter"
        ? cls.manufacturer
        : (icao && manufacturerFromIcao(icao)) || cls.manufacturer;
      const typeInfo = canonicalizeType({ icao, manufacturer, family: cls.family, name: cls.name }, hexRec?.icaoType ?? null);
      const wing: Wing = raw.wing ?? (/Helicopters|^Bell$|^Leonardo$|^Robinson$|^Sikorsky$/.test(typeInfo.manufacturer) ? "RW" : "FW");
      const rawOp = r.operators.find((o) => o.seq === raw.operatorSeq)!;
      const a: Aircraft = {
        reg: raw.reg,
        hex: hexRec?.hex ?? null,
        operatorId: ident.id,
        operator: ident.name,
        operatorLegal: ident.legalName,
        category: raw.category,
        permit: { no: raw.permitNo, validUntil: raw.validUntil },
        model: raw.model,
        type: typeInfo,
        wing,
        seats: parseSeats(raw.seatingRaw ?? ""),
        seatsRaw: raw.seatingRaw,
        role: roleFromSeating(raw.seatingRaw, raw.ops, raw.model),
        image: null,
        source: { file, asOn: r.asOn ?? snapshot, page: raw.page + 1 },
        firstSeen: history.firstSeen.get(raw.reg) ?? snapshot,
        history: aircraftHistoryFor(history, { reg: raw.reg, type: typeInfo }, snapshot),
      };
      aircraft.push(a);

      let op = operators.get(ident.id);
      if (!op) {
        op = {
          id: ident.id,
          name: ident.name,
          legalName: ident.legalName,
          category: raw.category,
          website: ident.website,
          permit: { no: rawOp.permitNo, validUntil: rawOp.validUntil },
          ops: rawOp.ops,
          fleetCount: 0,
          statedCount: rawOp.statedCount,
          types: [],
          wings: { FW: 0, RW: 0, B: 0 },
          seatsTotal: 0,
          heroReg: null,
        };
        operators.set(ident.id, op);
      }
      op.fleetCount += 1;
      op.wings[wing] += 1;
      op.seatsTotal += a.seats ?? 0;
      const t = op.types.find((x) => x.name === typeInfo.name);
      if (t) t.count += 1;
      else op.types.push({ name: typeInfo.name, icao: typeInfo.icao, manufacturer: typeInfo.manufacturer, count: 1 });
    }
  }
  aircraft.sort((x, y) => x.reg.localeCompare(y.reg));

  // Images: every aircraft gets a photograph (see pipeline/lib/assignImages.ts).
  const imageCounts = assignImages(aircraft, imageCache as ImageCache);
  console.error(`images: ${JSON.stringify(imageCounts)}`);
  for (const op of operators.values()) {
    op.types.sort((x, y) => y.count - x.count);
    const hero = aircraft.find((a) => a.operatorId === op.id && a.image?.tier === "exact") ?? aircraft.find((a) => a.operatorId === op.id && a.image);
    op.heroReg = hero?.reg ?? null;
  }

  // Changes vs previous snapshot (only for categories present in both)
  interface ChangeRow { reg: string; operator: string; operatorId: string; model: string; type: string }
  interface MoveRow { reg: string; from: string; fromId: string; to: string; toId: string; model: string }
  let changes: { from: string; to: string; scope: string[]; added: ChangeRow[]; removed: ChangeRow[]; moved: MoveRow[] } | null = null;
  if (previous) {
    const prevFile = join("data", "snapshots", previous, "aircraft.json");
    if (existsSync(prevFile)) {
      const prev = JSON.parse(readFileSync(prevFile, "utf8")) as Aircraft[];
      const cats = new Set(prev.map((a) => a.category));
      const curr = aircraft.filter((a) => cats.has(a.category));
      const pm = new Map(prev.map((a) => [a.reg, a]));
      const cm = new Map(curr.map((a) => [a.reg, a]));
      const added = curr.filter((a) => !pm.has(a.reg)).map((a) => ({ reg: a.reg, operator: a.operator, operatorId: a.operatorId, model: a.model, type: a.type.name }));
      const removed = prev.filter((a) => !cm.has(a.reg)).map((a) => ({ reg: a.reg, operator: a.operator, operatorId: a.operatorId, model: a.model, type: a.type.name }));
      const moved = curr
        .filter((a) => pm.has(a.reg) && pm.get(a.reg)!.operatorId !== a.operatorId)
        .map((a) => ({ reg: a.reg, from: pm.get(a.reg)!.operator, fromId: pm.get(a.reg)!.operatorId, to: a.operator, toId: a.operatorId, model: a.model }));
      changes = { from: previous, to: snapshot, scope: [...cats], added, removed, moved };
    }
  }

  const sources = results.map((r) => {
    const file = r.category === "scheduled" ? "sch-oper.pdf" : "ns-oper.pdf";
    const p = join(rawDir, file);
    return {
      category: r.category,
      file,
      asOn: r.asOn,
      url: r.category === "scheduled"
        ? "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/scheduled/sch-oper.pdf"
        : "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/nonscheduled/ns-oper.pdf",
      sha256: existsSync(p) ? sha(p) : null,
      bytes: existsSync(p) ? statSync(p).size : null,
      operators: r.operators.length,
      aircraft: r.aircraft.length,
    };
  });

  const ops = [...operators.values()].sort((x, y) => y.fleetCount - x.fleetCount || x.name.localeCompare(y.name));
  const meta = {
    generatedAt: new Date().toISOString(),
    snapshot,
    previous,
    sources,
    counts: {
      aircraft: aircraft.length,
      operators: ops.length,
      scheduled: aircraft.filter((a) => a.category === "scheduled").length,
      nonScheduled: aircraft.filter((a) => a.category === "non-scheduled").length,
      fixedWing: aircraft.filter((a) => a.wing === "FW").length,
      rotary: aircraft.filter((a) => a.wing === "RW").length,
      balloons: aircraft.filter((a) => a.wing === "B").length,
      withHex: aircraft.filter((a) => a.hex).length,
    },
    issues,
  };

  // Slim index for the client-side explorer
  const index = aircraft.map((a) => ({
    r: a.reg, h: a.hex, o: a.operatorId, on: a.operator, c: a.category === "scheduled" ? "S" : "N",
    m: a.model, t: a.type.name, ti: a.type.icao, mf: a.type.manufacturer, w: a.wing, s: a.seats, ro: a.role,
    i: a.image ? [a.image.src, a.image.tier === "exact" ? 0 : a.image.tier === "operator-type" ? 1 : 2] : null,
    f: a.firstSeen,
  }));

  const csvHeader = ["reg","hex","operator","operator_legal","category","permit_no","permit_valid_until","model","type_icao","type_manufacturer","type_name","wing","seats","seats_raw","role","source_file","source_as_on","first_seen","registered_on","msn","year_of_manufacture","owner","lessor"];
  const csvEsc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [csvHeader.join(","), ...aircraft.map((a) => [a.reg,a.hex,a.operator,a.operatorLegal,a.category,a.permit.no,a.permit.validUntil,a.model,a.type.icao,a.type.manufacturer,a.type.name,a.wing,a.seats,a.seatsRaw,a.role,a.source.file,a.source.asOn,a.firstSeen,a.history.registeredOn,a.history.msn,a.history.yearOfManufacture,a.history.owner,a.history.lessor].map(csvEsc).join(","))].join("\n");

  writeFileSync(join(outDir, "aircraft.json"), JSON.stringify(aircraft, null, 1));
  writeFileSync(join(outDir, "operators.json"), JSON.stringify(ops, null, 1));
  writeFileSync(join(outDir, "meta.json"), JSON.stringify(meta, null, 1));
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index));
  writeFileSync(join(outDir, "aircraft.csv"), csv);
  if (changes) writeFileSync(join(outDir, "changes.json"), JSON.stringify(changes, null, 1));
  writeFileSync(join(outDir, "events.json"), JSON.stringify(history.events, null, 1));
  writeFileSync(join(outDir, "snapshots.json"), JSON.stringify(history.snapshots, null, 1));

  const latest = join("data", "latest");
  mkdirSync(latest, { recursive: true });
  cpSync(outDir, latest, { recursive: true });
  console.log(JSON.stringify(meta.counts, null, 1));
  if (changes) console.log(`changes vs ${previous}: +${changes.added.length} -${changes.removed.length} ~${changes.moved.length}`);
  console.log(`events: ${history.events.length} (${Object.entries(history.counts).map(([k, v]) => `${k} ${v}`).join(", ")})`);
  console.log(`with registeredOn: ${aircraft.filter((a) => a.history.registeredOn).length}, with msn: ${aircraft.filter((a) => a.history.msn).length}`);
  console.log(`issues: ${issues.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
