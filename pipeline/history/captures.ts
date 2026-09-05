// Parse every archived DGCA operator list into data/parsed/history/<list>/<as-on>.json.
// Same ParseResult shape as data/parsed/<snapshot>/, wrapped with provenance.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { extractWords } from "../lib/bbox";
import { parseScheduled } from "../parsers/scheduled";
import { parseNonScheduled } from "../parsers/nonscheduled";
import type { ParseResult } from "../lib/types";
import { readManifest, type ListName, type ManifestEntry } from "./wayback";

export interface HistorySnapshot {
  list: ListName;
  /** the "as on" date printed in the PDF, or the capture date when it is missing */
  asOn: string;
  /** true when the PDF printed no date and the Wayback capture date was used instead */
  asOnFallback: boolean;
  source: "dgca" | "wayback";
  url: string | null;
  /** repo-relative path of the PDF this came from */
  file: string;
  sha256: string;
  bytes: number;
  /** Wayback capture timestamp, null for the locally fetched snapshots */
  timestamp: string | null;
  result: ParseResult;
}

export const HISTORY_PARSED_DIR = join("data", "parsed", "history");

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

function captureDate(timestamp: string): string {
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
}

function parsePdf(list: ListName, pdf: string): ParseResult {
  const pages = extractWords(pdf);
  return list === "scheduled" ? parseScheduled(pages) : parseNonScheduled(pages);
}

export interface ParseCapturesReport {
  list: ListName;
  written: HistorySnapshot[];
  duplicates: Array<{ asOn: string; kept: string; dropped: string }>;
  unusable: Array<{ file: string; reason: string }>;
}

/**
 * Parse every capture of one list, keep the largest file per as-on date, and write
 * data/parsed/history/<list>/<as-on>.json.
 */
export function parseCaptures(list: ListName, verbose = true): ParseCapturesReport {
  const dir = join("data", "raw", "wayback", list);
  const outDir = join(HISTORY_PARSED_DIR, list);
  mkdirSync(outDir, { recursive: true });
  const manifest = readManifest(list);
  const byAsOn = new Map<string, HistorySnapshot>();
  const duplicates: ParseCapturesReport["duplicates"] = [];
  const unusable: ParseCapturesReport["unusable"] = [];

  for (const c of manifest.captures as ManifestEntry[]) {
    const pdf = join(dir, c.file);
    if (!existsSync(pdf)) continue;
    const result = parsePdf(list, pdf);
    if (!result.aircraft.length) {
      // A capture the parsers cannot read at all would look like the whole fleet vanishing.
      unusable.push({ file: pdf, reason: "no aircraft parsed" });
      continue;
    }
    const fallback = !result.asOn;
    const asOn = result.asOn ?? captureDate(c.timestamp);
    if (fallback) {
      result.issues.push({ level: "warn", message: `No "as on" date printed; using capture date ${asOn}` });
    }
    const snap: HistorySnapshot = {
      list,
      asOn,
      asOnFallback: fallback,
      source: "wayback",
      url: c.url,
      file: pdf,
      sha256: c.sha256,
      bytes: c.bytes,
      timestamp: c.timestamp,
      result,
    };
    const prev = byAsOn.get(asOn);
    if (prev) {
      const keep = snap.bytes > prev.bytes ? snap : prev;
      const drop = keep === snap ? prev : snap;
      duplicates.push({ asOn, kept: keep.file, dropped: drop.file });
      byAsOn.set(asOn, keep);
    } else {
      byAsOn.set(asOn, snap);
    }
  }

  const written = [...byAsOn.values()].sort((a, b) => a.asOn.localeCompare(b.asOn));
  const keep = new Set(written.map((s) => `${s.asOn}.json`));
  // Drop snapshots from an earlier run whose as-on date changed, so a re-parse cannot
  // leave a phantom snapshot in the chain.
  for (const f of readdirSync(outDir)) if (f.endsWith(".json") && !keep.has(f)) rmSync(join(outDir, f));
  for (const s of written) writeFileSync(join(outDir, `${s.asOn}.json`), JSON.stringify(s, null, 1));
  if (verbose) {
    for (const s of written) {
      const errors = s.result.issues.filter((i) => i.level === "error").length;
      const mismatch = s.result.issues.filter((i) => /mismatch/i.test(i.message)).length;
      console.log(
        `  ${s.asOn}  ${String(s.result.aircraft.length).padStart(4)} aircraft  ${String(s.result.operators.length).padStart(3)} operators  errors=${errors} count-mismatch=${mismatch}${s.asOnFallback ? "  (date from capture)" : ""}`,
      );
    }
    for (const d of duplicates) console.log(`  duplicate as-on ${d.asOn}: kept ${d.kept}, dropped ${d.dropped}`);
    for (const u of unusable) console.log(`  unusable ${u.file}: ${u.reason}`);
  }
  return { list, written, duplicates, unusable };
}

/** Every archived snapshot of one list, newest last. */
export function loadHistorySnapshots(list: ListName): HistorySnapshot[] {
  const dir = join(HISTORY_PARSED_DIR, list);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as HistorySnapshot)
    .sort((a, b) => a.asOn.localeCompare(b.asOn));
}

const LIVE_URL: Record<ListName, string> = {
  scheduled:
    "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/scheduled/sch-oper.pdf",
  "non-scheduled":
    "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/nonscheduled/ns-oper.pdf",
};

/** The snapshots this repo fetched itself, from data/parsed/<date>/ and data/raw/<date>/. */
export function loadLocalSnapshots(): HistorySnapshot[] {
  const parsedRoot = join("data", "parsed");
  if (!existsSync(parsedRoot)) return [];
  const out: HistorySnapshot[] = [];
  for (const dir of readdirSync(parsedRoot).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()) {
    for (const list of ["scheduled", "non-scheduled"] as ListName[]) {
      const f = join(parsedRoot, dir, `${list}.json`);
      if (!existsSync(f)) continue;
      const result = JSON.parse(readFileSync(f, "utf8")) as ParseResult;
      const pdf = join("data", "raw", dir, list === "scheduled" ? "sch-oper.pdf" : "ns-oper.pdf");
      out.push({
        list,
        asOn: result.asOn ?? dir,
        asOnFallback: !result.asOn,
        source: "dgca",
        url: LIVE_URL[list],
        file: pdf,
        sha256: existsSync(pdf) ? sha256(pdf) : "",
        bytes: existsSync(pdf) ? statSync(pdf).size : 0,
        timestamp: null,
        result,
      });
    }
  }
  return out;
}

/** The full chain for one list: archived captures plus this repo's own snapshots. */
export function snapshotChain(list: ListName): HistorySnapshot[] {
  const byAsOn = new Map<string, HistorySnapshot>();
  for (const s of loadHistorySnapshots(list)) byAsOn.set(s.asOn, s);
  // A snapshot we fetched ourselves always wins over an Archive copy of the same list.
  for (const s of loadLocalSnapshots().filter((s) => s.list === list)) byAsOn.set(s.asOn, s);
  return [...byAsOn.values()].sort((a, b) => a.asOn.localeCompare(b.asOn));
}
