// Parser for DGCA's "List of DGCA Approved Flying Training Organisations" (flyclub.pdf).
//
// One table row per FTO: S No | Name | Location of Flying Bases | Firm Ownership Type |
// DGCA Approval No. | Validity From | To | Fleet Details | Contact details | Remarks.
// Every cell is vertically centred in its row and the fleet cell is (almost) always the
// tallest, so rows are segmented on the fleet column: each FTO's fleet opens with a
// "No. of SE: n" line. A row that crosses a page break simply continues at the top of the
// next page, so all pages are read as one continuous stream.
import { groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { classifyModel, identifyOperator, type TypeInfo } from "../lib/normalize";
import { cleanModel, cleanSpaces, parseAsOn } from "../lib/text";

export type FleetSection = "SE" | "ME" | "LSA" | "helicopter";

export interface TrainingAircraft {
  reg: string;
  /** model as printed, minus list numbering and separators */
  model: string;
  type: TypeInfo;
  /** the fleet sub-list the aircraft is printed under, null when no heading preceded it */
  section: FleetSection | null;
}

export interface Fto {
  id: string;
  seq: number;
  name: string;
  bases: string[];
  ownership: string | null;
  approvalNo: string | null;
  validFrom: string | null;
  validUntil: string | null;
  singleEngine: number | null;
  multiEngine: number | null;
  aircraft: TrainingAircraft[];
  remarks: string | null;
  page: number;
}

export interface TrainingIssue {
  level: "warn" | "error";
  ftoId: string | null;
  message: string;
  page?: number;
}

export interface TrainingParse {
  asOn: string | null;
  ftos: Fto[];
  issues: TrainingIssue[];
  /** registration-like text that did not normalise to VT-XXX, for the console report */
  unnormalised: Array<{ ftoId: string; text: string }>;
}

interface Cols {
  bodyY0: number;
  nameX0: number;
  basesX0: number;
  ownX0: number;
  apprX0: number;
  fromX0: number;
  toX0: number;
  fleetX0: number;
  fleetX1: number;
  remarksX0: number;
}

/** A word placed on the continuous stream: pages stacked, `vy` grows monotonically. */
interface StreamWord extends Word {
  page: number;
  vy: number;
}

interface Line {
  page: number;
  vy: number;
  words: StreamWord[];
  text: string;
}

const PAGE_STRIDE = 10_000;

/**
 * Column bands from the header on page 1 (the only page that prints it). The constants are
 * the positions measured on the 03.10.2026 list and only apply when an anchor is missing.
 */
function detectCols(page: Page): Cols {
  const w = page.words;
  const find = (re: RegExp) => w.find((x) => x.cy < 130 && re.test(x.text));
  const location = find(/^Location$/i);
  const ownership = find(/^Ownership$/i);
  const approval = find(/^Approval$/i);
  const from = find(/^From$/i);
  const to = w.find((x) => x.cy < 130 && /^To$/.test(x.text) && (!from || x.x0 > from.x1));
  const fleet = find(/^Fleet$/i);
  const contact = find(/^Contact$/i);
  const remarks = find(/^Remarks$/i);
  // The fleet heading is one centred line ("Fleet Details Single Engine/ Multi Engine");
  // its last word bounds the column on the right, well clear of the contact text.
  const fleetHead = fleet ? w.filter((x) => Math.abs(x.cy - fleet.cy) < 2 && x.x0 >= fleet.x0 && (!contact || x.x1 < contact.x0)) : [];
  const headerBottom = Math.max(...[from, to, find(/^Type$/)].filter((x): x is Word => !!x).map((x) => x.y1), 0);
  return {
    bodyY0: headerBottom ? headerBottom + 2 : 114,
    nameX0: 34,
    basesX0: (location?.x0 ?? 107) - 2,
    ownX0: (ownership?.x0 ?? 201) - 5,
    apprX0: (approval?.x0 ?? 252) - 3,
    fromX0: (from?.x0 ?? 291) - 2,
    toX0: (to?.x0 ?? 334) - 1,
    fleetX0: (fleet?.x0 ?? 389) - 8,
    fleetX1: fleetHead.length ? Math.max(...fleetHead.map((x) => x.x1)) + 6 : 525,
    remarksX0: (remarks?.x0 ?? 768) - 22,
  };
}

const mid = (w: Word) => (w.x0 + w.x1) / 2;

/** Lines of one column across the stream, in reading order. */
function columnLines(words: StreamWord[]): Line[] {
  const byPage = new Map<number, StreamWord[]>();
  for (const w of words) {
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page)!.push(w);
  }
  const lines: Line[] = [];
  for (const [page, ws] of [...byPage].sort((a, b) => a[0] - b[0])) {
    for (const row of groupRows(ws, 3.5) as StreamWord[][]) {
      lines.push({ page, vy: page * PAGE_STRIDE + row[0].cy, words: row, text: joinText(row) });
    }
  }
  return lines;
}

/**
 * PDFium repeats a line that sits on a page break at the foot of one page and the head of
 * the next ("2. BPI Airport," twice). Drop the second copy and say so.
 */
function dropPageBreakRepeats(lines: Line[], onDrop: (l: Line) => void): Line[] {
  return lines.filter((l, i) => {
    const prev = lines[i - 1];
    const repeat = !!prev && prev.page !== l.page && prev.text === l.text;
    if (repeat) onDrop(l);
    return !repeat;
  });
}

const FLEET_HEADER = /^No\.?\s*of\s*(SE|ME|LSA)\s*:?\s*(\d{1,3})?\s*$/i;
const HELI_HEADER = /HELICOPTER/i;
/** "1.", "10.", "4.   ", "10 " in front of a fleet entry. */
const ITEM_NO = /^\d{1,2}(?:\.\s*|\s+)(?=\D)/;
/**
 * The registration closes every fleet entry, spelled any of "VT-HOT", "VT- LEO", "VT ALI",
 * "VTALI", "VT -PTF", "VT - ENC", "VT:NBV", "VT: NWG", "(VT-PMA)", "VT-AFC.", "VT-ETV,",
 * and glued to the model as in "III),VT-SSY" or "SW:VT-DPA".
 */
const REG_TAIL = /(?:^|[^A-Z0-9])\(?\s*VT\s*[-:.]?\s*[-:]?\s*([A-Z0-9]{1,5})\s*\)?[\s.,;]*$/i;
const MODEL_EDGE = /^[\s:;,.\-\u2013(]+|[\s:;,.\-\u2013(]+$/g;

/** "29.04.2029" or "24/07/2030" to ISO. */
function parseDate(s: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * Split the bases cell into one string per numbered base ("1. Juhu Airport, Mumbai, ...").
 * An unnumbered cell is a single base. Wrapped lines are joined with a space.
 */
function splitBases(lines: Line[]): string[] {
  const bases: string[] = [];
  for (const l of lines) {
    const m = /^(\d{1,2})\.(?!\d)\s*(.*)$/.exec(l.text);
    if (m || !bases.length) bases.push(m ? m[2] : l.text);
    else bases[bases.length - 1] += ` ${l.text}`;
  }
  return bases.map((b) => cleanSpaces(b).replace(/[\s,]+$/, "")).filter(Boolean);
}

/** The FTO name without the "(A unit of ...)" note, which would otherwise end up in the id. */
function ftoId(name: string): string {
  return identifyOperator(name.replace(/\s*\(\s*a\s+unit\s+of\b.*$/i, ""), null).id;
}

interface Block {
  fleet: Line[];
  top: number;
  bottom: number;
}

export function parseTraining(pages: Page[]): TrainingParse {
  const issues: TrainingIssue[] = [];
  const unnormalised: TrainingParse["unnormalised"] = [];
  const c = detectCols(pages[0]);
  const head = pages[0].words.filter((w) => w.cy < c.bodyY0).map((w) => w.text).join(" ");
  const asOn = parseAsOn(head);

  // Words of every page on one stream, minus the title and header band of page 1.
  const stream: StreamWord[] = [];
  for (const p of pages) {
    for (const w of p.words) {
      if (p.index === 0 && w.cy < c.bodyY0) continue;
      stream.push({ ...w, page: p.index, vy: p.index * PAGE_STRIDE + w.cy });
    }
  }
  const inBand = (x0: number, x1: number) => stream.filter((w) => mid(w) >= x0 && mid(w) < x1);
  const repeatDropped = (l: Line) =>
    issues.push({ level: "warn", ftoId: null, message: `Dropped "${l.text}" repeated across the page break`, page: l.page });

  // 1. Rows from the fleet column: a "No. of SE" heading opens the next FTO. A second
  // heading of a kind already seen in the current row also does, so an FTO printed without
  // single-engine aircraft (or without the SE line) still gets its own row.
  const fleetLines = dropPageBreakRepeats(columnLines(inBand(c.fleetX0, c.fleetX1)), repeatDropped);
  const blocks: Block[] = [];
  let seen = new Set<string>();
  for (const l of fleetLines) {
    const h = FLEET_HEADER.exec(l.text);
    const kind = h?.[1].toUpperCase();
    if (!blocks.length || (kind && (kind === "SE" || seen.has(kind)))) {
      blocks.push({ fleet: [], top: l.vy, bottom: l.vy });
      seen = new Set();
    }
    if (kind) seen.add(kind);
    const b = blocks[blocks.length - 1];
    b.fleet.push(l);
    b.bottom = l.vy;
  }

  // 2. Row bounds: halfway between one fleet cell's last line and the next one's first;
  // when the next row starts on a new page, the bound is that page's top.
  const bounds = blocks.map((b, i) => {
    const prev = blocks[i - 1];
    if (!prev) return -Infinity;
    const samePage = Math.floor(prev.bottom / PAGE_STRIDE) === Math.floor(b.top / PAGE_STRIDE);
    return samePage ? (prev.bottom + b.top) / 2 : Math.floor(b.top / PAGE_STRIDE) * PAGE_STRIDE;
  });
  const blockOf = (vy: number) => {
    let k = -1;
    for (let i = 0; i < bounds.length; i += 1) if (vy >= bounds[i]) k = i;
    return k;
  };
  // Repeats are only dropped within one row: two rows may well both say "Private Ltd.".
  const cellLines = (x0: number, x1: number, extra?: (w: StreamWord) => boolean) => {
    const per: Line[][] = blocks.map(() => []);
    for (const l of columnLines(inBand(x0, x1).filter((w) => !extra || extra(w)))) {
      const k = blockOf(l.vy);
      if (k >= 0) per[k].push(l);
    }
    return per.map((ls) => dropPageBreakRepeats(ls, repeatDropped));
  };

  const serialLines = cellLines(0, c.nameX0, (w) => /^\d{1,3}$/.test(w.text));
  const nameLines = cellLines(c.nameX0, c.basesX0);
  const baseLines = cellLines(c.basesX0, c.ownX0);
  const ownLines = cellLines(c.ownX0, c.apprX0);
  const apprLines = cellLines(c.apprX0, c.fromX0);
  const fromLines = cellLines(c.fromX0, c.toX0);
  const toLines = cellLines(c.toX0, c.fleetX0);
  const remarkLines = cellLines(c.remarksX0, Infinity);

  const ftos: Fto[] = [];
  const usedIds = new Map<string, number>();
  blocks.forEach((b, i) => {
    const serials = serialLines[i].map((l) => Number(l.text));
    const name = cleanSpaces(nameLines[i].map((l) => l.text).join(" "));
    const page = (serialLines[i][0] ?? b.fleet[0]).page;
    let id = name ? ftoId(name) : `fto-${i + 1}`;
    const dup = usedIds.get(id) ?? 0;
    usedIds.set(id, dup + 1);
    if (dup) {
      issues.push({ level: "error", ftoId: id, message: `Two FTOs share the id ${id}; the second is ${id}-${dup + 1}`, page });
      id = `${id}-${dup + 1}`;
    }
    const say = (level: TrainingIssue["level"], message: string, p = page) => issues.push({ level, ftoId: id, message, page: p });

    if (serials.length !== 1) say("error", `Row has ${serials.length} serial numbers (${serials.join(", ") || "none"}); rows may be mis-segmented`);
    if (!name) say("error", "Row has no name");
    const seq = serials[0] ?? i + 1;
    if (seq !== i + 1) say("warn", `Serial ${seq} printed on row ${i + 1}`);

    // The bounds above assume the fleet cell is the tallest in its row. A line of another
    // cell outside the fleet cell's vertical extent (on that page) means a taller cell, whose
    // edges may have been given to the neighbouring row.
    const extent = new Map<number, [number, number]>();
    for (const l of b.fleet) {
      const [lo, hi] = extent.get(l.page) ?? [Infinity, -Infinity];
      extent.set(l.page, [Math.min(lo, l.vy), Math.max(hi, l.vy)]);
    }
    const cells = { name: nameLines[i], bases: baseLines[i], ownership: ownLines[i], remarks: remarkLines[i] };
    for (const [label, ls] of Object.entries(cells)) {
      const out = ls.filter((l) => {
        const e = extent.get(l.page);
        return !e || l.vy < e[0] - 6 || l.vy > e[1] + 6;
      });
      if (out.length) say("warn", `The ${label} cell runs past the fleet cell ("${out[0].text}"); check its row assignment`, out[0].page);
    }

    const dates = (ls: Line[]) => ls.map((l) => parseDate(l.text)).find(Boolean) ?? null;
    const fto: Fto = {
      id,
      seq,
      name,
      bases: splitBases(baseLines[i]),
      ownership: cleanSpaces(ownLines[i].map((l) => l.text).join(" ")) || null,
      approvalNo: cleanSpaces(apprLines[i].map((l) => l.text).join(" ")) || null,
      validFrom: dates(fromLines[i]),
      validUntil: dates(toLines[i]),
      singleEngine: null,
      multiEngine: null,
      aircraft: [],
      remarks: cleanSpaces(remarkLines[i].map((l) => l.text).join(" ")) || null,
      page,
    };
    if (toLines[i].length && !fto.validUntil) say("warn", `Unreadable validity date "${toLines[i].map((l) => l.text).join(" ")}"`);

    // 3. Fleet entries. A line that carries no registration is held and prefixed to the
    // next one, in case a long model name wrapped.
    const stated = new Map<FleetSection, number>();
    let section: FleetSection | null = null;
    let carry = "";
    for (const l of b.fleet) {
      const h = FLEET_HEADER.exec(l.text);
      if (h) {
        section = h[1].toUpperCase() as FleetSection;
        if (h[2] != null) stated.set(section, Number(h[2]));
        else say("warn", `Fleet heading without a count: "${l.text}"`, l.page);
        carry = "";
        continue;
      }
      if (HELI_HEADER.test(l.text) && !/VT/i.test(l.text)) {
        section = "helicopter";
        carry = "";
        continue;
      }
      const text = cleanSpaces(`${carry} ${l.text}`).replace(ITEM_NO, "");
      const m = REG_TAIL.exec(text);
      if (!m) {
        if (/\bVT\b|VT-/i.test(text)) {
          unnormalised.push({ ftoId: id, text });
          say("error", `Registration does not normalise: "${text}"`, l.page);
          carry = "";
        } else {
          carry = text;
        }
        continue;
      }
      carry = "";
      const suffix = m[1].toUpperCase();
      if (!/^[A-Z]{3}$/.test(suffix)) {
        unnormalised.push({ ftoId: id, text });
        say("error", `Registration does not normalise: "${text}"`, l.page);
        continue;
      }
      const reg = `VT-${suffix}`;
      const model = cleanModel(text.slice(0, m.index).replace(MODEL_EDGE, ""));
      if (!model) say("warn", `No model printed for ${reg}`, l.page);
      if (!section) say("warn", `${reg} is listed before any SE/ME heading`, l.page);
      fto.aircraft.push({ reg, model, type: classifyModel(model, section === "helicopter" ? "RW" : null), section });
    }
    if (carry) say("warn", `Fleet text without a registration: "${carry}"`);

    fto.singleEngine = stated.get("SE") ?? null;
    fto.multiEngine = stated.get("ME") ?? null;

    // 4. Stated counts against what was parsed. Mismatches are recorded, never corrected.
    for (const [sec, n] of stated) {
      const parsed = fto.aircraft.filter((a) => a.section === sec).length;
      if (parsed !== n) say("warn", `${sec} count mismatch: stated ${n}, parsed ${parsed}`);
    }
    const uncounted = fto.aircraft.filter((a) => a.section === "helicopter" || (a.section && !stated.has(a.section)));
    if (uncounted.length) {
      say("warn", `${uncounted.length} aircraft listed under a heading without a stated count (${uncounted.map((a) => a.reg).join(", ")})`);
    }
    const regs = fto.aircraft.map((a) => a.reg);
    const twice = [...new Set(regs.filter((r, k) => regs.indexOf(r) !== k))];
    if (twice.length) say("warn", `Listed more than once in this FTO: ${twice.join(", ")}`);
    if (!fto.aircraft.length) say("warn", "No aircraft parsed");
    ftos.push(fto);
  });

  // The same aircraft under two FTOs.
  const owner = new Map<string, string>();
  for (const f of ftos) {
    for (const r of new Set(f.aircraft.map((a) => a.reg))) {
      const prev = owner.get(r);
      if (prev) issues.push({ level: "warn", ftoId: f.id, message: `${r} is also listed under ${prev}` });
      else owner.set(r, f.id);
    }
  }
  const seqs = ftos.map((f) => f.seq);
  for (let n = 1; n <= Math.max(0, ...seqs); n += 1) {
    if (!seqs.includes(n)) issues.push({ level: "error", ftoId: null, message: `Serial ${n} was not found` });
  }

  return { asOn, ftos, issues, unnormalised };
}
