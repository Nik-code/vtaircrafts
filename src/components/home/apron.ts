import type { Wing } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { GLYPH_ID, glyphDefs } from "./glyphs";

export interface ApronAircraft {
  reg: string;
  type: string;
  wing: Wing;
}

export interface ApronGroup {
  id: string;
  name: string;
  scheduled: boolean;
  aircraft: ApronAircraft[];
}

/* Drawing units. The SVG scales to its container, so these are ratios, not pixels. */
export const VW = 900;      // sheet width
const PITCH = 14;    // horizontal step between parked aircraft
const ROW = 17;      // vertical step between rows
const TICK = 6;      // station tick + gap before an operator name
const AFTER = 11;    // gap after an operator name
const CHAR = 7.7;    // advance of one uppercase mono character at NAME_SIZE
const NAME_SIZE = 10;
const NAME_TRACK = 0.9;
const BASELINE = 12; // text baseline inside a 0..17 row
const GROUP_GAP = 16;// gap after a labelled operator's aircraft, before the next name
const SMALL_GAP = 3; // gap between two unlabelled operators inside the "more" block
const MIN_INLINE = 4;// glyphs that must fit beside a name, else the row starts lower
const PAD_T = 8;
const PAD_B = 6;

/** Glyphs are authored in a 0..10 box; drawn GLYPH_SCALE larger, centred on the same anchor. */
const GLYPH_SCALE = 1.25;
const GLYPH_OFFSET = 5 * (1 - GLYPH_SCALE);

/** Operators smaller than this flow into one unlabelled "and N more" block. */
const LABEL_MIN = 12;

/** Paper and mint-tinted paper, sitting on the blueprint ground. */
const FILL_SCHEDULED = "#EFEBE0";
const FILL_NONSCHEDULED = "#8DC2B7";
/** Dim paper: the quiet "and N more operators" label, not tied to one operator. */
const FILL_MORE = "rgba(243,240,232,0.55)";

interface Placed { x: number; row: number }
interface PlacedGlyph extends Placed { a: ApronAircraft }
interface PlacedName extends Placed { name: string }

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type FlowKey = "s" | "n";
interface FlowItem {
  key: FlowKey;
  /** null = no name drawn (an unlabelled operator folded into the "more" block). */
  displayName: string | null;
  isMore?: boolean;
  aircraft: ApronAircraft[];
}

/**
 * Splits operators into the ones worth naming (LABEL_MIN aircraft or more,
 * already the largest operators since `groups` arrives largest-first) and
 * everyone else, who flow together into one quiet "and N more operators"
 * block: one label, then their aircraft, unlabelled, in the same order.
 */
function prepareFlow(groups: ApronGroup[]): FlowItem[] {
  const big = groups.filter((g) => g.aircraft.length >= LABEL_MIN);
  const small = groups.filter((g) => g.aircraft.length < LABEL_MIN);

  const flow: FlowItem[] = big.map((g) => ({
    key: g.scheduled ? "s" : "n",
    displayName: g.name,
    aircraft: g.aircraft,
  }));

  if (small.length > 0) {
    flow.push({
      key: "s",
      displayName: `and ${fmtInt(small.length)} more operators`,
      isMore: true,
      aircraft: [],
    });
    for (const g of small) {
      flow.push({ key: g.scheduled ? "s" : "n", displayName: null, aircraft: g.aircraft });
    }
  }

  return flow;
}

/**
 * Flows every aircraft into rows the way words flow into a paragraph: a named
 * operator's name, then its aircraft, then the next name. Operators too small
 * to earn a label fold into one quiet "and N more operators" block and keep
 * flowing with only a small gap between them. A name that will not fit beside
 * at least a few of its own aircraft starts the row lower rather than being
 * shortened.
 */
export function layoutApron(groups: ApronGroup[]) {
  const glyphs: Record<FlowKey, PlacedGlyph[]> = { s: [], n: [] };
  const names: Record<FlowKey, PlacedName[]> = { s: [], n: [] };
  const moreNames: PlacedName[] = [];
  let x = 0;
  let row = 0;
  const newline = () => { x = 0; row += 1; };

  for (const item of prepareFlow(groups)) {
    if (item.displayName !== null) {
      const label = item.displayName.toUpperCase();
      const nameW = TICK + label.length * CHAR + AFTER;
      if (x > 0 && x + nameW + MIN_INLINE * PITCH > VW) newline();
      const entry = { x: round(x), row, name: label };
      if (item.isMore) moreNames.push(entry);
      else names[item.key].push(entry);
      x += nameW;
    } else if (x > 0) {
      x += SMALL_GAP;
    }
    if (x + PITCH > VW) newline();
    for (const a of item.aircraft) {
      if (x + PITCH > VW) newline();
      glyphs[item.key].push({ x: round(x), row, a });
      x += PITCH;
    }
    if (item.displayName !== null && !item.isMore) x += GROUP_GAP;
  }
  const rows = row + 1;
  return { glyphs, names, moreNames, rows, height: PAD_T + rows * ROW + PAD_B };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Serialises the whole apron as one SVG string. Written by hand rather than as
 * JSX so that anchors cost few bytes each: fill, size and tracking live on the
 * layer, the row `<g>` carries y, and each aircraft only spends bytes on its
 * own href, title and position.
 */
export function apronSvg(groups: ApronGroup[], titleId: string, descId: string) {
  const { glyphs, names, moreNames, height } = layoutApron(groups);
  const total = groups.reduce((n, g) => n + g.aircraft.length, 0);

  const layer = (key: FlowKey, fill: string) => {
    const byRow = new Map<number, PlacedGlyph[]>();
    for (const p of glyphs[key]) {
      const list = byRow.get(p.row);
      if (list) list.push(p);
      else byRow.set(p.row, [p]);
    }
    let out = `<g fill='${fill}'>`;
    for (const [r, list] of byRow) {
      out += `<g transform='translate(0,${PAD_T + r * ROW})'>`;
      for (const p of list) {
        const tx = round(p.x + GLYPH_OFFSET);
        out += `<a href='/aircraft/${p.a.reg}'><title>${esc(p.a.reg)} · ${esc(p.a.type)}</title><use href='#${GLYPH_ID[p.a.wing]}' transform='translate(${tx},${GLYPH_OFFSET}) scale(${GLYPH_SCALE})'/></a>`;
      }
      out += `</g>`;
    }
    return `${out}</g>`;
  };

  const nameLayer = (key: FlowKey, fill: string) => {
    if (names[key].length === 0) return "";
    let out = `<g fill='${fill}' font-size='${NAME_SIZE}' letter-spacing='${NAME_TRACK}'>`;
    for (const p of names[key]) {
      const y = PAD_T + p.row * ROW;
      out += `<rect x='${p.x}' y='${y + 1}' width='1' height='${ROW - 5}' opacity='.75'/>`;
      out += `<text x='${p.x + TICK}' y='${y + BASELINE}'>${esc(p.name)}</text>`;
    }
    return `${out}</g>`;
  };

  const moreLayer = () => {
    if (moreNames.length === 0) return "";
    let out = `<g fill='${FILL_MORE}' font-size='${NAME_SIZE}' letter-spacing='${NAME_TRACK}' font-style='italic'>`;
    for (const p of moreNames) {
      const y = PAD_T + p.row * ROW;
      out += `<text x='${p.x}' y='${y + BASELINE}'>${esc(p.name)}</text>`;
    }
    return `${out}</g>`;
  };

  /*
   * The chart is served standalone (see src/app/apron.svg/route.ts) and injected
   * into the page as a plain markup string, so it carries its own hover style
   * rather than depending on page CSS reaching an injected-then-hydrated string.
   */
  const style =
    `<style>` +
    `use{transition:fill 150ms}` +
    `a:hover use{fill:#FF4F00}` +
    `@media (prefers-reduced-motion: reduce){use{transition:none}}` +
    `</style>`;

  const svg =
    `<svg viewBox='0 0 ${VW} ${height}' width='100%' role='img' aria-labelledby='${titleId} ${descId}' style='display:block;overflow:visible'>` +
    `<title id='${titleId}'>Apron chart of ${fmtInt(total)} aircraft</title>` +
    `<desc id='${descId}'>Every aircraft on the DGCA operator lists, drawn as one glyph and parked in blocks by operator, largest operator first. Operators with fewer than ${LABEL_MIN} aircraft are grouped into one unlabelled block.</desc>` +
    style +
    glyphDefs() +
    layer("s", FILL_SCHEDULED) +
    layer("n", FILL_NONSCHEDULED) +
    nameLayer("s", FILL_SCHEDULED) +
    nameLayer("n", FILL_NONSCHEDULED) +
    moreLayer() +
    `</svg>`;
  return { svg, height, width: VW };
}

export const APRON_FILL = { scheduled: FILL_SCHEDULED, nonScheduled: FILL_NONSCHEDULED };
