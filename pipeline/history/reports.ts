// Parse the DGCA registration / de-registration / change-of-ownership reports.
// These are the only public DGCA documents that carry an exact date per airframe.
//
// Two layouts exist:
//   legacy (2009-2013): SL NO. | REGN. NO. | TYPE OF AIRCRAFT | C O R NO. / DATE OF ... |
//                       OWNER/OPERATOR  (owner, lessor and operator run together in one cell)
//   modern (2019):      S.N | Reg Mark | MSN | Date of Reg | [Date of De-Registration] |
//                       Type of Aircraft | Year of Manufacture | Owner | Lessor | Operator
//
// Cells are multi-line and vertically centred, so a record is everything between the
// midpoints of consecutive registration rows rather than everything below its own row.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractWords, groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { normalizeReg } from "../lib/text";
import { getBuffer, isPdf } from "./http";
import { REPORT_SOURCES, reportUrl, type ReportKind, type ReportSource } from "./reportSources";

export interface ReportRow {
  reg: string;
  msn: string | null;
  dateOfRegistration: string | null;
  dateOfDeregistration: string | null;
  /** the date printed in this report's own date column, whatever it means for that report */
  date: string | null;
  kind: ReportKind;
  type: string | null;
  yearOfManufacture: number | null;
  owner: string | null;
  lessor: string | null;
  operator: string | null;
  source: { file: string; url: string; page: number };
}

export interface ReportResult {
  file: string;
  kind: ReportKind;
  url: string;
  from: string;
  to: string;
  layout: "legacy" | "modern";
  rows: ReportRow[];
  dropped: Array<{ page: number; reason: string; text: string }>;
}

export const REPORTS_DIR = join("data", "raw", "reports");
export const REPORTS_PARSED_DIR = join("data", "parsed", "reports");

const mid = (w: Word) => (w.x0 + w.x1) / 2;
const span = (ws: Word[]) => ({ x0: Math.min(...ws.map((w) => w.x0)), x1: Math.max(...ws.map((w) => w.x1)) });

interface Column {
  key: string;
  /** inclusive left edge of the column band */
  from: number;
  /** exclusive right edge */
  to: number;
}

interface Layout {
  kind: "legacy" | "modern";
  columns: Column[];
}

/** Vertical extent of one header block, used to keep records out of it. */
interface Band {
  top: number;
  bottom: number;
}

const TITLE_RE = /^(NEW REGISTRATION|DE-?REGISTRATION|CHANGE (OF OWNERSHIP|TO C OF R)|Changes to C of R|List of (Aircraft|aircraft))/i;

// Every word that appears in a column label, in either layout. A row made only of these
// is part of a header block; the first row that is not ends it.
const HEADER_WORD =
  /^(SL|S\.?N\.?|S\.?L\.?|NO\.?\/?|\/|REGN?\.?|MARK|MSN|TYPE|OF|AIRCRAFT|C|O|R|DATE|DE-?|DE-?REGN\.?|DE-?REGISTRATION|REGISTRATION|CHANGE|IN|OWNER|LESSOR|OPERATOR|OWNER\/OPERATOR|YEAR|MANU-|FACTURE)$/i;

/**
 * Header blocks: maximal runs of label-only rows that name both the serial and the
 * registration column. A page can hold several (one per monthly section).
 */
function headerBlocks(page: Page): Word[][] {
  const rows = groupRows(page.words, 4);
  const blocks: Word[][] = [];
  let run: Word[][] = [];
  const flush = () => {
    const words = run.flat();
    run = [];
    if (words.length < 4) return;
    if (!words.some((w) => /^(SL|S\.?N\.?|S\.?L\.?)$/i.test(w.text))) return;
    if (!words.some((w) => /^(REGN?\.?|MSN|MARK)$/i.test(w.text))) return;
    blocks.push(words);
  };
  for (const row of rows) {
    if (row.every((w) => HEADER_WORD.test(w.text))) run.push(row);
    else flush();
  }
  flush();
  return blocks;
}

function bandsToColumns(bands: Array<{ key: string; x0: number; x1: number }>, pageWidth: number): Column[] {
  const sorted = [...bands].sort((a, b) => a.x0 - b.x0);
  return sorted.map((b, i) => ({
    key: b.key,
    from: i === 0 ? -Infinity : (sorted[i - 1].x1 + b.x0) / 2,
    to: i === sorted.length - 1 ? pageWidth + 1000 : (b.x1 + sorted[i + 1].x0) / 2,
  }));
}

function detectLayout(page: Page, blocks: Word[][]): Layout | null {
  if (!blocks.length) return null;
  const words = blocks[0];
  const pick = (re: RegExp) => words.filter((w) => re.test(w.text));
  const msn = pick(/^MSN$/i);
  const bands: Array<{ key: string; x0: number; x1: number }> = [];

  if (msn.length) {
    // modern (2019)
    const sn = pick(/^S\.?N\.?$/i);
    const year = pick(/^(Year|Manu-|facture)$/i);
    const owner = pick(/^Owner$/i);
    const lessor = pick(/^Lessor$/i);
    const operator = pick(/^Operator$/i);
    const type = pick(/^(Type|Aircraft)$/i);
    const dereg = pick(/^(De-|De-Registration|Registration)$/i);
    if (!sn.length || !year.length || !owner.length || !operator.length || !type.length) return null;
    const msnSpan = span(msn);
    const typeSpan = span(type);
    const nextAfterDate = dereg.length ? span(dereg).x0 : typeSpan.x0;
    const regMark = words.filter((w) => /^(Reg|Mark)$/i.test(w.text) && w.x1 <= msnSpan.x0);
    const dateReg = words.filter(
      (w) => /^(Date|of|Reg\.?)$/i.test(w.text) && w.x0 >= msnSpan.x1 && w.x1 <= nextAfterDate,
    );
    if (!regMark.length || !dateReg.length) return null;
    bands.push({ key: "sn", ...span(sn) });
    bands.push({ key: "reg", ...span(regMark) });
    bands.push({ key: "msn", ...msnSpan });
    bands.push({ key: "dateReg", ...span(dateReg) });
    if (dereg.length) bands.push({ key: "dateDereg", ...span(dereg) });
    bands.push({ key: "type", ...typeSpan });
    bands.push({ key: "year", ...span(year) });
    bands.push({ key: "owner", ...span(owner) });
    if (lessor.length) bands.push({ key: "lessor", ...span(lessor) });
    bands.push({ key: "operator", ...span(operator) });
  } else {
    // legacy (2009-2013)
    const sl = pick(/^S\.?L\.?$/i);
    const regn = pick(/^REGN\.?$/i).sort((a, b) => a.x0 - b.x0)[0];
    const type = pick(/^(TYPE|AIRCRAFT)$/i);
    const owner = pick(/^(OWNER\/OPERATOR|OWNER|OPERATOR)$/i).sort((a, b) => b.x0 - a.x0)[0];
    if (!sl.length || !regn || !type.length || !owner) return null;
    const typeSpan = span(type);
    const snWords = [...sl, ...words.filter((w) => /^NO\.?$/i.test(w.text) && w.x0 < regn.x0)];
    const regWords = [regn, ...words.filter((w) => /^NO\.?$/i.test(w.text) && w.x0 >= regn.x0 && w.x1 <= regn.x1 + 40)];
    const corWords = words.filter((w) => w.x0 > typeSpan.x1 && w.x1 < owner.x0);
    if (!corWords.length) return null;
    bands.push({ key: "sn", ...span(snWords) });
    bands.push({ key: "reg", ...span(regWords) });
    bands.push({ key: "type", ...typeSpan });
    bands.push({ key: "date", ...span(corWords) });
    bands.push({ key: "owner", ...span([owner]) });
  }

  return { kind: msn.length ? "modern" : "legacy", columns: bandsToColumns(bands, page.width) };
}

function colOf(layout: Layout, w: Word): string | null {
  const m = mid(w);
  for (const c of layout.columns) if (m >= c.from && m < c.to) return c.key;
  return null;
}

const MONTH_DAY = /(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{2,4})/;

export function parseReportDate(text: string): string | null {
  const m = MONTH_DAY.exec(text);
  if (!m) return null;
  const d = +m[1];
  const mo = +m[2];
  let y = +m[3];
  if (m[3].length === 2) y = y < 50 ? 2000 + y : 1900 + y;
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1930 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "OWNER :- X Add- … LESSOR:- Y … OPERATOR:- Z" -> the three parties. */
function splitParties(text: string): { owner: string | null; lessor: string | null; operator: string | null } {
  const clean = text.replace(/\s+/g, " ").trim();
  const marks = [...clean.matchAll(/\b(OWNER|LESSOR|OWNER\/LESSOR|OPERATOR)\s*:?-?\s*:?/gi)];
  if (!marks.length) return { owner: null, lessor: null, operator: trimParty(clean) || null };
  const out: Record<string, string> = {};
  marks.forEach((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index! : clean.length;
    const value = trimParty(clean.slice(start, end));
    const label = m[1].toUpperCase();
    if (label === "OWNER/LESSOR") {
      out.OWNER ??= value;
      out.LESSOR ??= value;
    } else out[label] ??= value;
  });
  return { owner: out.OWNER ?? null, lessor: out.LESSOR ?? null, operator: out.OPERATOR ?? null };
}

/** "BOEING B737-800 AIRCRAFT" -> "BOEING B737-800"; drops address digits that bleed in. */
function cleanType(s: string): string {
  return s
    .replace(/\b(AIRCRAFT|HELICOPTER|HEICOPTER|HELICOPTERS)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimParty(s: string): string {
  return s
    .replace(/\bAdd[-–—:]?\s*[-–—]?.*$/i, "")
    .replace(/^[\d,\s.:-]+/, "")
    .replace(/[,\s.:-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseReport(pdfPath: string, src: ReportSource): ReportResult {
  const pages = extractWords(pdfPath);
  const rows: ReportRow[] = [];
  const dropped: ReportResult["dropped"] = [];
  let layout: Layout | null = null;
  const url = reportUrl(src.file);

  for (const page of pages) {
    const blocks = headerBlocks(page);
    const detected = detectLayout(page, blocks);
    if (detected) layout = detected;
    if (!layout) {
      dropped.push({ page: page.index, reason: "no column header seen yet", text: "" });
      continue;
    }
    const l = layout;
    // A page can carry several monthly sections; a record never crosses a header block.
    const bands: Band[] = blocks.map((b) => ({
      top: Math.min(...b.map((w) => w.y0)),
      bottom: Math.max(...b.map((w) => w.y1)),
    }));

    // Registration rows anchor the records.
    const anchors = page.words
      .filter((w) => colOf(l, w) === "reg" && normalizeReg(w.text))
      .filter((w) => !bands.some((b) => w.cy >= b.top && w.cy <= b.bottom))
      .sort((a, b) => a.cy - b.cy);
    if (!anchors.length) continue;

    for (let i = 0; i < anchors.length; i += 1) {
      const cy = anchors[i].cy;
      let top = i === 0 ? 0 : (anchors[i - 1].cy + cy) / 2;
      let bottom = i === anchors.length - 1 ? page.height + 1 : (cy + anchors[i + 1].cy) / 2;
      for (const b of bands) {
        if (b.bottom <= cy && b.bottom > top) top = b.bottom;
        if (b.top > cy && b.top < bottom) bottom = b.top;
      }
      const cells = new Map<string, Word[]>();
      for (const w of page.words) {
        if (w.cy <= top || w.cy >= bottom) continue;
        if (TITLE_RE.test(w.text)) continue;
        const key = colOf(l, w);
        if (!key) continue;
        const list = cells.get(key) ?? [];
        list.push(w);
        cells.set(key, list);
      }
      const text = (key: string) => {
        const ws = cells.get(key);
        if (!ws?.length) return "";
        return groupRows(ws, 4).map((r) => joinText(r)).join(" ").replace(/\s+/g, " ").trim();
      };
      const reg = normalizeReg(anchors[i].text);
      if (!reg) continue;

      if (l.kind === "legacy") {
        const date = parseReportDate(text("date"));
        const parties = splitParties(text("owner"));
        if (!date) {
          dropped.push({ page: page.index, reason: `no date for ${reg}`, text: text("date") });
          continue;
        }
        rows.push({
          reg,
          msn: null,
          dateOfRegistration: src.kind === "deregistration" ? null : date,
          dateOfDeregistration: src.kind === "deregistration" ? date : null,
          date,
          kind: src.kind,
          type: cleanType(text("type")) || null,
          yearOfManufacture: null,
          ...parties,
          source: { file: src.file, url, page: page.index + 1 },
        });
      } else {
        const dateReg = parseReportDate(text("dateReg"));
        const dateDereg = parseReportDate(text("dateDereg"));
        const date = src.kind === "deregistration" ? dateDereg : dateReg;
        if (!date) {
          dropped.push({ page: page.index, reason: `no date for ${reg}`, text: `${text("dateReg")} | ${text("dateDereg")}` });
          continue;
        }
        const yearRaw = text("year").match(/\d{4}/);
        rows.push({
          reg,
          msn: text("msn") || null,
          dateOfRegistration: dateReg,
          dateOfDeregistration: dateDereg,
          date,
          kind: src.kind,
          type: cleanType(text("type")) || null,
          yearOfManufacture: yearRaw ? Number(yearRaw[0]) : null,
          owner: text("owner") || null,
          lessor: text("lessor") || null,
          operator: text("operator") || null,
          source: { file: src.file, url, page: page.index + 1 },
        });
      }
    }
  }

  return { file: src.file, kind: src.kind, url, from: src.from, to: src.to, layout: layout?.kind ?? "legacy", rows, dropped };
}

/** Download every report that is not already on disk. */
export async function fetchReports(): Promise<void> {
  mkdirSync(REPORTS_DIR, { recursive: true });
  for (const s of REPORT_SOURCES) {
    const dest = join(REPORTS_DIR, s.file);
    if (existsSync(dest)) continue;
    const buf = await getBuffer(reportUrl(s.file), { delay: 800 });
    if (!buf || !isPdf(buf)) {
      console.warn(`  ! ${s.file}: not a PDF`);
      continue;
    }
    writeFileSync(dest, buf);
    console.log(`  saved ${s.file}  ${buf.length}B`);
  }
}

export function parseAllReports(verbose = true): ReportResult[] {
  mkdirSync(REPORTS_PARSED_DIR, { recursive: true });
  const results: ReportResult[] = [];
  for (const s of REPORT_SOURCES) {
    const pdf = join(REPORTS_DIR, s.file);
    if (!existsSync(pdf)) {
      if (verbose) console.warn(`  ! ${s.file} missing`);
      continue;
    }
    const r = parseReport(pdf, s);
    writeFileSync(join(REPORTS_PARSED_DIR, `${s.file}.json`), JSON.stringify(r, null, 1));
    results.push(r);
    if (verbose) {
      const outside = r.rows.filter((x) => x.date && (x.date < s.from || x.date > s.to)).length;
      console.log(
        `  ${s.file.padEnd(30)} ${r.layout.padEnd(6)} rows=${String(r.rows.length).padStart(4)} dropped=${r.dropped.length} outside-period=${outside}`,
      );
    }
  }
  return results;
}

export function loadReports(): ReportResult[] {
  const out: ReportResult[] = [];
  for (const s of REPORT_SOURCES) {
    const p = join(REPORTS_PARSED_DIR, `${s.file}.json`);
    if (existsSync(p)) out.push(JSON.parse(readFileSync(p, "utf8")) as ReportResult);
  }
  return out;
}
