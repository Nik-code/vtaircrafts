// Enumerate and download Wayback Machine captures of the two DGCA operator lists.
// Raw PDFs land in data/raw/wayback/<list>/<YYYYMMDDhhmmss>.pdf with a manifest.json.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getBuffer, getText, isPdf } from "./http";

export type ListName = "scheduled" | "non-scheduled";

export interface CaptureSource {
  list: ListName;
  /** original URL as it must be given to the CDX API and the /web/<ts>id_/ replay path */
  url: string;
  /** why this URL form exists, for the manifest */
  note?: string;
}

/**
 * Every URL form the two lists have lived at. The `dgca.gov.in/digigov-portal/?page=…`
 * forms are ALSO enumerated: the Archive holds many captures of them, but every one is
 * the portal's HTML shell (the PDF is injected into an iframe by JavaScript), so they
 * are downloaded, rejected by the %PDF magic-byte check and recorded as skipped.
 */
export const CAPTURE_SOURCES: CaptureSource[] = [
  {
    list: "scheduled",
    url: "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/scheduled/sch-oper.pdf",
  },
  {
    list: "non-scheduled",
    url: "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/airOperation/certification/nonscheduled/ns-oper.pdf",
  },
  { list: "scheduled", url: "http://dgca.gov.in/nsoper/sch-oper.pdf", note: "pre-2020 site" },
  { list: "non-scheduled", url: "http://dgca.gov.in/nsoper/ns-oper.pdf", note: "pre-2020 site" },
  { list: "scheduled", url: "http://dgca.nic.in/nsoper/sch-oper.pdf", note: "pre-2020 site (nic.in)" },
  { list: "non-scheduled", url: "http://dgca.nic.in/nsoper/ns-oper.pdf", note: "pre-2020 site (nic.in)" },
  { list: "scheduled", url: "http://dgca.nic.in/operator/sch-oper.pdf", note: "pre-2020 site (nic.in)" },
  { list: "non-scheduled", url: "http://dgca.nic.in/operator/ns-oper.pdf", note: "pre-2020 site (nic.in)" },
  { list: "scheduled", url: "http://dgca.gov.in/operator/sch-oper.pdf", note: "pre-2020 site" },
  { list: "non-scheduled", url: "http://dgca.gov.in/operator/ns-oper.pdf", note: "pre-2020 site" },
  {
    list: "scheduled",
    url: "https://www.dgca.gov.in/digigov-portal/?page=jsp/dgca/InventoryList/airOperation/certification/scheduled/sch-oper.pdf",
    note: "digigov portal shell",
  },
  {
    list: "scheduled",
    url: "https://dgca.gov.in/digigov-portal/?page=jsp/dgca/InventoryList/airOperation/certification/scheduled/sch-oper.pdf",
    note: "digigov portal shell",
  },
  {
    list: "scheduled",
    url: "https://www.dgca.gov.in/digigov-portal/?page=jsp%2Fdgca%2FInventoryList%2FairOperation%2Fcertification%2Fscheduled%2Fsch-oper.pdf",
    note: "digigov portal shell",
  },
  {
    list: "scheduled",
    url: "https://www.dgca.gov.in/digigov-portal/?page=jsp/dgca/InventoryList/airOperation/certification/scheduled/cargo/sch-oper1.pdf",
    note: "digigov portal shell (older scheduled copy)",
  },
  {
    list: "non-scheduled",
    url: "https://www.dgca.gov.in/digigov-portal/?page=jsp/dgca/InventoryList/airOperation/certification/nonscheduled/ns-oper.pdf",
    note: "digigov portal shell",
  },
  {
    list: "non-scheduled",
    url: "https://dgca.gov.in/digigov-portal/?page=jsp/dgca/InventoryList/airOperation/certification/nonscheduled/ns-oper.pdf",
    note: "digigov portal shell",
  },
  {
    list: "non-scheduled",
    url: "https://www.dgca.gov.in/digigov-portal/?page=jsp%2Fdgca%2FInventoryList%2FairOperation%2Fcertification%2Fnonscheduled%2Fns-oper.pdf",
    note: "digigov portal shell",
  },
];

export interface ManifestEntry {
  timestamp: string;
  url: string;
  digest: string;
  sha256: string;
  bytes: number;
  file: string;
}

export interface SkippedEntry {
  timestamp: string;
  url: string;
  digest: string;
  reason: string;
}

export interface Manifest {
  list: ListName;
  fetchedAt: string;
  captures: ManifestEntry[];
  skipped: SkippedEntry[];
}

const CDX = "http://web.archive.org/cdx/search/cdx";

interface CdxRow {
  timestamp: string;
  digest: string;
  length: number;
  url: string;
}

export async function cdxQuery(url: string): Promise<CdxRow[]> {
  const q = new URLSearchParams({
    url,
    fl: "timestamp,digest,statuscode,length",
    collapse: "digest",
    "filter": "statuscode:200",
  });
  // The Archive goes offline for minutes at a time. A query that never comes back is not
  // fatal: captures already on disk are kept and the next run picks up what was missed.
  const body = await getText(`${CDX}?${q.toString()}`, { softFail: [404], tries: 6, optional: true });
  if (!body) return [];
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/))
    .filter((p) => p.length >= 4)
    .map((p) => ({ timestamp: p[0], digest: p[1], length: Number(p[3]), url }));
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export function manifestPath(list: ListName): string {
  return join("data", "raw", "wayback", list, "manifest.json");
}

export function readManifest(list: ListName): Manifest {
  const p = manifestPath(list);
  if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8")) as Manifest;
  return { list, fetchedAt: new Date().toISOString(), captures: [], skipped: [] };
}

/** Download every unique-digest capture of `list` that is not already on disk. */
export async function fetchList(list: ListName): Promise<Manifest> {
  const dir = join("data", "raw", "wayback", list);
  mkdirSync(dir, { recursive: true });
  const manifest = readManifest(list);
  const known = new Map(manifest.captures.map((c) => [c.digest, c]));
  const skipped = new Map(manifest.skipped.map((s) => [`${s.digest}|${s.timestamp}`, s]));

  const rows: CdxRow[] = [];
  for (const src of CAPTURE_SOURCES.filter((s) => s.list === list)) {
    const found = await cdxQuery(src.url);
    console.log(`  cdx ${src.url} -> ${found.length} capture(s)`);
    rows.push(...found);
  }
  // One row per digest; prefer the largest recorded length.
  const byDigest = new Map<string, CdxRow>();
  for (const r of rows) {
    const prev = byDigest.get(r.digest);
    if (!prev || r.length > prev.length) byDigest.set(r.digest, r);
  }

  for (const row of [...byDigest.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const file = `${row.timestamp}.pdf`;
    const dest = join(dir, file);
    const existing = known.get(row.digest);
    if (existing && existsSync(join(dir, existing.file))) continue;
    if (skipped.has(`${row.digest}|${row.timestamp}`)) continue;
    const replay = `http://web.archive.org/web/${row.timestamp}id_/${row.url}`;
    const buf = await getBuffer(replay, { softFail: [404, 403, 451] });
    if (!buf) {
      manifest.skipped.push({ timestamp: row.timestamp, url: row.url, digest: row.digest, reason: "download failed" });
      continue;
    }
    if (!isPdf(buf)) {
      const head = buf.subarray(0, 200).toString("latin1").replace(/\s+/g, " ").trim().slice(0, 60);
      console.log(`  skip ${row.timestamp} (not a PDF: ${buf.length}B "${head}")`);
      manifest.skipped.push({ timestamp: row.timestamp, url: row.url, digest: row.digest, reason: "not a PDF" });
      continue;
    }
    writeFileSync(dest, buf);
    const entry: ManifestEntry = {
      timestamp: row.timestamp,
      url: row.url,
      digest: row.digest,
      sha256: sha256(buf),
      bytes: buf.length,
      file,
    };
    manifest.captures.push(entry);
    known.set(row.digest, entry);
    console.log(`  saved ${file}  ${buf.length}B  ${row.url}`);
  }

  // Re-stat anything already on disk so bytes/sha stay truthful.
  manifest.captures = manifest.captures
    .filter((c) => existsSync(join(dir, c.file)))
    .map((c) => {
      const p = join(dir, c.file);
      return { ...c, bytes: statSync(p).size, sha256: sha256(readFileSync(p)) };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  manifest.skipped.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  manifest.fetchedAt = new Date().toISOString();
  writeFileSync(manifestPath(list), JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function fetchAll(): Promise<Record<ListName, Manifest>> {
  const out = {} as Record<ListName, Manifest>;
  for (const list of ["scheduled", "non-scheduled"] as ListName[]) {
    console.log(`wayback: ${list}`);
    out[list] = await fetchList(list);
    console.log(`  ${out[list].captures.length} PDF capture(s), ${out[list].skipped.length} skipped`);
  }
  return out;
}
