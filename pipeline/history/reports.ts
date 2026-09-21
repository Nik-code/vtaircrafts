// Parse the DGCA registration / de-registration / change-of-ownership reports.
// These are the only public DGCA documents that carry an exact date per airframe.
//
// Two layouts exist:
//   legacy (2009-Aug 2013): SL NO. | REGN. NO. | TYPE OF AIRCRAFT | C O R NO. / DATE OF ... |
//                           OWNER/OPERATOR  (owner, lessor and operator run together in one cell)
//   modern (Sep 2013 on):   serial | Reg Mark | MSN | date column(s) | Type | Year of Manuf |
//                           Owner | Lessor | Operator
// The modern header is reworded in almost every file ("SR NO", "S/N", "dt of dregn",
// "YearofMan ufacture", type and year swapped, one date column or two), so its columns are
// found from the few words every variant shares rather than from a fixed label set.
//
// Cells are multi-line and usually vertically centred, so a record is everything between the
// midpoints of consecutive registration rows rather than everything below its own row. A few
// modern files align them to the top or bottom of the row instead; see `detectAlignment`.
//
// Dates are day-first except where a spreadsheet export got in the way; see `pickDateOrder`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractWords, groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { isRegPrefix, normalizeReg } from "../lib/text";
import { getBuffer, isPdf } from "./http";
import { REPORT_SOURCES, reportUrl, type ReportKind, type ReportSource } from "./reportSources";

export interface ReportRow {
  reg: string;
  msn: string | null;
  dateOfRegistration: string | null;
  dateOfDeregistration: string | null;
  /** the date printed in this report's own date column, whatever it means for that report */
  date: string | null;
  /**
   * The month the report section covers ("CHANGE TO C OF R IN THE MONTH OF OCTOBER, 2011"),
   * or the whole report period when a page prints no month. For ownership changes this is
   * the only dating available: their date column is the aircraft's registration date.
   */
  period: { from: string; to: string };
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
  /** how the modern date columns were read; always "dmy" for legacy files */
  dateOrder: "dmy" | "mdy" | "swapped";
  /** where a record's multi-line cells sit relative to its registration row */
  alignment: "top" | "middle" | "bottom";
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
  /** centre of the column's header label */
  centre: number;
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
  /^(SL|SR|S\.?N\.?|S\/N|S\.?L\.?|S\.|S\.NO\.?|NO\.?\/?|\/|REGN?\.?|MARK|MSN|TYPE|OF|AIRCRAFT|C|O|R|DATE|DT|DE-?|DE-?REGN?\.?|DREGN|DE-?REGISTRATION|DEREGISTRATIO|N|REGISTRATION|CHANGE|IN|OWNER|LESSOR|OPERATOR|OWNER\/OPERATOR|YEAR|YEAROFMAN|UFACTURE|MANU-?|MANUF\.?|MANUFAC|MANUFACTURE|TURE|FACTURE)$/i;
const SERIAL_WORD = /^(SL|SR|S\.?N\.?|S\/N|S\.?L\.?|S\.|S\.NO\.?)$/i;
const YEAR_WORD = /^(YEAR|YEAROFMAN|UFACTURE|MANU-?|MANUF\.?|MANUFAC|MANUFACTURE|TURE|FACTURE)$/i;
const DATE_WORD = /^(DATE|DT|OF|REGN?\.?|DE-?|DE-?REGN?\.?|DREGN|DE-?REGISTRATION|DEREGISTRATIO|N|REGISTRATION)$/i;

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
    if (!words.some((w) => SERIAL_WORD.test(w.text))) return;
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
    centre: (b.x0 + b.x1) / 2,
    from: i === 0 ? -Infinity : (sorted[i - 1].x1 + b.x0) / 2,
    to: i === sorted.length - 1 ? pageWidth + 1000 : (b.x1 + sorted[i + 1].x0) / 2,
  }));
}

function detectLayout(page: Page, blocks: Word[][], kind: ReportKind): Layout | null {
  if (!blocks.length) return null;
  const words = blocks[0];
  const pick = (re: RegExp) => words.filter((w) => re.test(w.text));
  const msn = pick(/^MSN$/i);
  const bands: Array<{ key: string; x0: number; x1: number }> = [];

  if (msn.length) {
    // modern: anchor on the labels every variant prints, then read the date column(s) out
    // of whatever sits between MSN and the next labelled column.
    const sn = pick(SERIAL_WORD);
    const mark = pick(/^MARK$/i);
    const year = pick(YEAR_WORD);
    const owner = pick(/^Owner$/i);
    const lessor = pick(/^Lessor$/i);
    const operator = pick(/^Operator$/i);
    const type = pick(/^(Type|Aircraft)$/i);
    if (!sn.length || !mark.length || !year.length || !owner.length || !operator.length || !type.length) return null;
    const msnSpan = span(msn);
    const typeSpan = span(type);
    const yearSpan = span(year);
    const afterDates = Math.min(typeSpan.x0, yearSpan.x0);
    const regMark = words.filter((w) => /^(REGN?\.?|MARK)$/i.test(w.text) && w.x1 <= msnSpan.x0);
    const dates = words.filter((w) => DATE_WORD.test(w.text) && mid(w) > msnSpan.x1 && mid(w) < afterDates);
    if (!regMark.length || !dates.length) return null;
    // "Date of Reg." and "Date of De-Reg." side by side: split at the second "Date".
    const starts = dates.filter((w) => /^(DATE|DT)$/i.test(w.text)).map((w) => w.x0).sort((a, b) => a - b);
    const second = starts.find((x) => x - starts[0] > 15);
    const regSpan = span(regMark);
    bands.push({ key: "sn", ...span([...sn, ...words.filter((w) => /^NO\.?$/i.test(w.text) && w.x1 < regSpan.x0)]) });
    bands.push({ key: "reg", ...regSpan });
    bands.push({ key: "msn", ...msnSpan });
    if (second !== undefined) {
      bands.push({ key: "dateReg", ...span(dates.filter((w) => mid(w) < second - 1)) });
      bands.push({ key: "dateDereg", ...span(dates.filter((w) => mid(w) >= second - 1)) });
    } else {
      bands.push({ key: kind === "deregistration" ? "dateDereg" : "dateReg", ...span(dates) });
    }
    bands.push({ key: "type", ...typeSpan });
    bands.push({ key: "year", ...yearSpan });
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

/**
 * Header labels are narrower than the cells under them, so the midpoint between two labels
 * can cut through a wide centred cell. The table's rules leave a gutter no word crosses;
 * move each boundary to the nearest such gutter between the two labels.
 */
function snapToGutters(layout: Layout, body: Word[]): Layout {
  if (body.length < 8) return layout;
  const spans = body.map((w) => [w.x0, w.x1] as const).sort((a, b) => a[0] - b[0]);
  const gutters: Array<[number, number]> = [];
  let reach = spans[0][1];
  for (const [x0, x1] of spans) {
    if (x0 > reach + 1) gutters.push([reach, x0]);
    reach = Math.max(reach, x1);
  }
  const columns = layout.columns.map((c) => ({ ...c }));
  for (let i = 0; i + 1 < columns.length; i += 1) {
    // Nearest to the label midpoint, not widest: a narrow left-aligned value (a year) leaves
    // its widest gutter on the far side of the value.
    const guess = columns[i].to;
    const away = ([g0, g1]: [number, number]) => (guess < g0 ? g0 - guess : guess > g1 ? guess - g1 : 0);
    const between = gutters
      .filter(([g0, g1]) => g1 > columns[i].centre && g0 < columns[i + 1].centre)
      .sort((a, b) => away(a) - away(b) || b[1] - b[0] - (a[1] - a[0]))[0];
    if (!between) continue;
    const edge = (Math.max(between[0], columns[i].centre) + Math.min(between[1], columns[i + 1].centre)) / 2;
    columns[i].to = edge;
    columns[i + 1].from = edge;
  }
  return { ...layout, columns };
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

interface RawDate {
  a: number;
  b: number;
  y: number;
}

/**
 * dmy: what DGCA prints. mdy: a whole file exported with US dates ("1/25/2024").
 * swapped: a spreadsheet export that flipped only the dates whose day could pass for a
 * month, so "01-03-2025" is 3 January while "16-01-2025" next to it is 16 January.
 */
type DateOrder = "dmy" | "mdy" | "swapped";

function rawDate(text: string): RawDate | null {
  const m = MONTH_DAY.exec(text);
  if (!m) return null;
  let y = +m[3];
  if (m[3].length === 2) y = y < 50 ? 2000 + y : 1900 + y;
  return { a: +m[1], b: +m[2], y };
}

function resolveDate(r: RawDate | null, order: DateOrder): string | null {
  if (!r) return null;
  const ambiguous = r.a <= 12 && r.b <= 12;
  const monthFirst = ambiguous ? order !== "dmy" : r.a <= 12;
  const d = monthFirst ? r.b : r.a;
  const mo = monthFirst ? r.a : r.b;
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || r.y < 1930 || r.y > 2100) return null;
  return `${r.y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * The reports are listed in date order, which is what gives a flipped export away: read
 * day-first, its dates jump back and forth. A file is day-first unless it holds dates that
 * can only be month-first, and "swapped" only when that reading removes most of the jumps.
 */
function pickDateOrder(raws: RawDate[], src: ReportSource): DateOrder {
  const onlyDayFirst = raws.filter((r) => r.a > 12 && r.b <= 12).length;
  const onlyMonthFirst = raws.filter((r) => r.b > 12 && r.a <= 12).length;
  if (onlyMonthFirst > onlyDayFirst) return "mdy";
  const cost = (order: DateOrder) => {
    const ds = raws.map((r) => resolveDate(r, order)).filter((d): d is string => !!d);
    let n = ds.filter((d) => d < src.from || d > src.to).length;
    for (let i = 1; i < ds.length; i += 1) if (ds[i] < ds[i - 1]) n += 1;
    return n;
  };
  const dmy = cost("dmy");
  return dmy >= 5 && cost("swapped") * 2 < dmy ? "swapped" : "dmy";
}

/**
 * Where a record's multi-line cells sit relative to its registration row. Most files centre
 * them, some hang them below the row (top-aligned) and some stack them above it
 * (bottom-aligned). Centred files give themselves away inside the page: a two-line cell
 * straddles the registration row without touching it. The other two only differ at the page
 * edges: top-aligned pages end with words below the last registration, bottom-aligned pages
 * start with words above the first.
 */
type Alignment = "top" | "middle" | "bottom";

const PAGE_FOOTER = /^(Page\s*)?\d+(\s*of\s*\d+)?$/i;

function detectAlignment(pages: Array<{ layout: Layout; anchors: Word[]; bands: Band[]; words: Word[] }>): Alignment {
  const PARTY = new Set(["type", "owner", "lessor", "operator"]);
  let multiLine = 0;
  let straddling = 0;
  let pagesWithLead = 0;
  let pagesWithTrail = 0;
  for (const p of pages) {
    const body = p.words.filter((w) => PARTY.has(colOf(p.layout, w) ?? "") && !p.bands.some((b) => w.cy >= b.top && w.cy <= b.bottom));
    const headerBottom = Math.max(0, ...p.bands.filter((b) => b.bottom < p.anchors[0].cy).map((b) => b.bottom));
    if (body.some((w) => w.cy > headerBottom && w.cy < p.anchors[0].cy - 4)) pagesWithLead += 1;
    const below = groupRows(body.filter((w) => w.cy > p.anchors[p.anchors.length - 1].cy + 4), 4);
    if (below.some((row) => !PAGE_FOOTER.test(joinText(row)))) pagesWithTrail += 1;
    p.anchors.forEach((a, i) => {
      const top = i === 0 ? headerBottom : (p.anchors[i - 1].cy + a.cy) / 2;
      const bottom = i === p.anchors.length - 1 ? Infinity : (a.cy + p.anchors[i + 1].cy) / 2;
      const mine = body.filter((w) => w.cy > top && w.cy < bottom);
      for (const key of PARTY) {
        const cell = mine.filter((w) => colOf(p.layout, w) === key);
        if (!cell.length) continue;
        const onRow = cell.some((w) => Math.abs(w.cy - a.cy) <= 2.5);
        if (cell.some((w) => Math.abs(w.cy - a.cy) > 2.5)) multiLine += 1;
        if (!onRow) straddling += 1;
      }
    });
  }
  if (!multiLine || straddling / multiLine > 0.15 || pagesWithLead === pagesWithTrail) return "middle";
  return pagesWithTrail > pagesWithLead ? "top" : "bottom";
}

/** "OWNER :- X Add- … LESSOR:- Y … OPERATOR:- Z" -> the three parties. */
function splitParties(text: string): { owner: string | null; lessor: string | null; operator: string | null } {
  const clean = text.replace(/\s+/g, " ").trim();
  const marks = [...clean.matchAll(/\b(OWNER\/LESSOR|OWNER|LESSOR|OPE[AR]{2}TOR)\s*:?-?\s*:?/gi)];
  if (!marks.length) return { owner: null, lessor: null, operator: trimParty(clean) || null };
  const out: Record<string, string> = {};
  marks.forEach((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index! : clean.length;
    const value = trimParty(clean.slice(start, end));
    const label = m[1].toUpperCase().replace(/^OPE[AR]{2}TOR$/, "OPERATOR");
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
    .replace(/^[\d,\s.:/-]+/, "")
    .replace(/[,\s.:-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MONTH_RE =
  /\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUNE?|JULY?|AUG(?:UST)?|SEP(?:T(?:EMBER)?)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)[,.\s]*(\d{4})\b/i;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "IN THE MONTH OF OCTOBER, 2011" -> the calendar month as an inclusive from/to. */
export function parseSectionMonth(text: string): { from: string; to: string } | null {
  const m = MONTH_RE.exec(text);
  if (!m) return null;
  const mo = MONTHS.indexOf(m[1].slice(0, 3).toUpperCase()) + 1;
  const y = Number(m[2]);
  if (!mo || y < 1990 || y > 2100) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const mm = String(mo).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

/** Section titles on a page ("CHANGE OF OWNERSHIP October 2009"), with the row they sit on. */
function sectionTitles(page: Page): Array<{ cy: number; period: { from: string; to: string } }> {
  const out: Array<{ cy: number; period: { from: string; to: string } }> = [];
  for (const row of groupRows(page.words, 4)) {
    if (row.length > 14) continue;
    const text = joinText(row);
    if (!/\b(CHANGE|REGISTRATION|OWNERSHIP|C OF R)\b/i.test(text)) continue;
    const period = parseSectionMonth(text);
    if (period) out.push({ cy: row[0].cy, period });
  }
  return out;
}

/** Some 2011-2012 reports print "VT- DCE" as two words; make each pair one anchor. */
function joinSplitRegs(words: Word[]): Word[] {
  const out: Word[] = [];
  const used = new Set<Word>();
  for (const w of words) {
    if (used.has(w)) continue;
    const tail = isRegPrefix(w.text)
      ? words.find((t) => !used.has(t) && t !== w && Math.abs(t.cy - w.cy) <= 2 && t.x0 >= w.x1 - 1 && t.x0 - w.x1 < 12 && /^[A-Z]{3}[.,]?$/.test(t.text))
      : undefined;
    if (!tail) {
      out.push(w);
      continue;
    }
    used.add(tail);
    out.push({ ...w, x1: tail.x1, text: `${w.text}${tail.text}` });
  }
  return out;
}

export function parseReport(pdfPath: string, src: ReportSource): ReportResult {
  const pages = extractWords(pdfPath);
  const rows: ReportRow[] = [];
  const dropped: ReportResult["dropped"] = [];
  const url = reportUrl(src.file);
  // A section's month carries over to the following pages until the next title.
  let period: { from: string; to: string } = { from: src.from, to: src.to };
  // Modern rows wait here until the whole file has been read and its date order is known.
  const pending: Array<{ row: ReportRow; reg: RawDate | null; dereg: RawDate | null; page: number; text: string }> = [];

  let layout: Layout | null = null;
  const prepared = pages.map((page) => {
    const blocks = headerBlocks(page);
    const detected = detectLayout(page, blocks, src.kind);
    if (detected) layout = detected;
    // A page can carry several monthly sections; a record never crosses a header block.
    const bands: Band[] = blocks.map((b) => ({
      top: Math.min(...b.map((w) => w.y0)),
      bottom: Math.max(...b.map((w) => w.y1)),
    }));
    const base = layout as Layout | null;
    const firstHeader = Math.min(Infinity, ...bands.map((b) => b.top));
    const l =
      base?.kind === "modern"
        ? snapToGutters(
            base,
            groupRows(page.words.filter((w) => (bands.length ? w.cy > firstHeader : true) && !bands.some((b) => w.cy >= b.top && w.cy <= b.bottom)), 4)
              .filter((row) => !PAGE_FOOTER.test(joinText(row)) && !TITLE_RE.test(joinText(row)))
              .flat(),
          )
        : base;
    // Registration rows anchor the records.
    const anchors = l
      ? joinSplitRegs(page.words.filter((w) => colOf(l, w) === "reg"))
          .filter((w) => normalizeReg(w.text))
          .filter((w) => !bands.some((b) => w.cy >= b.top && w.cy <= b.bottom))
          .sort((x, y) => x.cy - y.cy)
      : [];
    return { page, layout: l, bands, anchors };
  });

  const alignment = detectAlignment(
    prepared.flatMap((p) =>
      p.layout?.kind === "modern" && p.anchors.length
        ? [{ layout: p.layout, anchors: p.anchors, bands: p.bands, words: p.page.words }]
        : [],
    ),
  );

  for (const { page, layout: l, bands, anchors } of prepared) {
    if (!l) {
      dropped.push({ page: page.index, reason: "no column header seen yet", text: "" });
      continue;
    }
    const titles = sectionTitles(page);
    if (!anchors.length) continue;

    for (let i = 0; i < anchors.length; i += 1) {
      const cy = anchors[i].cy;
      let top = i === 0 ? 0 : (anchors[i - 1].cy + cy) / 2;
      let bottom = i === anchors.length - 1 ? page.height + 1 : (cy + anchors[i + 1].cy) / 2;
      if (alignment === "top") {
        top = anchors[i].y0 - 2;
        bottom = i === anchors.length - 1 ? page.height + 1 : anchors[i + 1].y0 - 2;
      } else if (alignment === "bottom") {
        top = i === 0 ? 0 : anchors[i - 1].y1 + 2;
        bottom = anchors[i].y1 + 2;
      }
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
      const title = titles.filter((t) => t.cy < cy).at(-1);
      if (title) period = title.period;

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
          period,
          kind: src.kind,
          type: cleanType(text("type")) || null,
          yearOfManufacture: null,
          ...parties,
          source: { file: src.file, url, page: page.index + 1 },
        });
      } else {
        const yearRaw = text("year").match(/\d{4}/);
        pending.push({
          reg: rawDate(text("dateReg")),
          dereg: rawDate(text("dateDereg")),
          page: page.index,
          text: `${text("dateReg")} | ${text("dateDereg")}`,
          row: {
            reg,
            msn: text("msn") || null,
            dateOfRegistration: null,
            dateOfDeregistration: null,
            date: null,
            period,
            kind: src.kind,
            type: cleanType(text("type")) || null,
            yearOfManufacture: yearRaw ? Number(yearRaw[0]) : null,
            owner: text("owner") || null,
            lessor: text("lessor") || null,
            operator: text("operator") || null,
            source: { file: src.file, url, page: page.index + 1 },
          },
        });
      }
    }
  }

  const primary = (p: (typeof pending)[number]) => (src.kind === "deregistration" ? p.dereg : p.reg);
  const dateOrder = pickDateOrder(pending.map(primary).filter((r): r is RawDate => !!r), src);
  for (const p of pending) {
    const date = resolveDate(primary(p), dateOrder);
    if (!date) {
      dropped.push({ page: p.page, reason: `no date for ${p.row.reg}`, text: p.text });
      continue;
    }
    rows.push({ ...p.row, dateOfRegistration: resolveDate(p.reg, dateOrder), dateOfDeregistration: resolveDate(p.dereg, dateOrder), date });
  }

  const kind = prepared.find((p) => p.layout)?.layout?.kind ?? "legacy";
  return { file: src.file, kind: src.kind, url, from: src.from, to: src.to, layout: kind, dateOrder, alignment, rows, dropped };
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
        `  ${s.file.padEnd(30)} ${r.layout.padEnd(6)} ${r.dateOrder.padEnd(7)} ${r.alignment.padEnd(6)} rows=${String(r.rows.length).padStart(4)} dropped=${r.dropped.length} outside-period=${outside}`,
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
