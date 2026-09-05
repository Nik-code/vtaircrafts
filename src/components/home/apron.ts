import type { Wing } from "@/lib/types";
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
const VW = 900;      // sheet width
const PITCH = 11;    // horizontal step between parked aircraft
const ROW = 13;      // vertical step between rows
const TICK = 5;      // station tick + gap before an operator name
const AFTER = 9;     // gap after an operator name
const CHAR = 5.72;   // advance of one uppercase mono character at NAME_SIZE
const NAME_SIZE = 7.4;
const NAME_TRACK = 0.95;
const BASELINE = 8;  // text baseline inside a 0..10 row
const GROUP_GAP = 11;// gap after a group, before the next operator name
const MIN_INLINE = 4;// glyphs that must fit beside a name, else the row starts lower
const PAD_T = 6;
const PAD_B = 4;

/** Paper and mint-tinted paper, sitting on the blueprint ground. */
const FILL_SCHEDULED = "#EFEBE0";
const FILL_NONSCHEDULED = "#8DC2B7";

interface Placed { x: number; row: number }
interface PlacedGlyph extends Placed { a: ApronAircraft }
interface PlacedName extends Placed { name: string }

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Flows every aircraft into rows the way words flow into a paragraph: an
 * operator's name, then its aircraft, then the next operator. A name that will
 * not fit beside at least a few of its own aircraft starts the row lower rather
 * than being shortened.
 */
export function layoutApron(groups: ApronGroup[]) {
  const glyphs: Record<"s" | "n", PlacedGlyph[]> = { s: [], n: [] };
  const names: Record<"s" | "n", PlacedName[]> = { s: [], n: [] };
  let x = 0;
  let row = 0;
  const newline = () => { x = 0; row += 1; };

  for (const g of groups) {
    const key = g.scheduled ? "s" : "n";
    const label = g.name.toUpperCase();
    const nameW = TICK + label.length * CHAR + AFTER;
    if (x > 0 && x + nameW + MIN_INLINE * PITCH > VW) newline();
    names[key].push({ x: round(x), row, name: label });
    x += nameW;
    if (x + PITCH > VW) newline();
    for (const a of g.aircraft) {
      if (x + PITCH > VW) newline();
      glyphs[key].push({ x: round(x), row, a });
      x += PITCH;
    }
    x += GROUP_GAP;
  }
  const rows = row + 1;
  return { glyphs, names, rows, height: PAD_T + rows * ROW + PAD_B };
}

function round(n: number) {
  return Math.round(n);
}

/**
 * Serialises the whole apron as one SVG string. Written by hand rather than as
 * JSX so that 1,300 anchors cost about 90 bytes each: fill and font live on the
 * two category layers, the row `<g>` carries y, and each aircraft only spends
 * bytes on its own href, title and x.
 */
export function apronSvg(groups: ApronGroup[], titleId: string, descId: string) {
  const { glyphs, names, height } = layoutApron(groups);
  const total = groups.reduce((n, g) => n + g.aircraft.length, 0);

  const layer = (key: "s" | "n", fill: string) => {
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
        out += `<a href='/aircraft/${p.a.reg}'><title>${esc(p.a.reg)} · ${esc(p.a.type)}</title><use href='#${GLYPH_ID[p.a.wing]}' x='${p.x}'/></a>`;
      }
      out += `</g>`;
    }
    return `${out}</g>`;
  };

  const nameLayer = (key: "s" | "n", fill: string) => {
    let out = `<g fill='${fill}' font-size='${NAME_SIZE}' letter-spacing='${NAME_TRACK}'>`;
    for (const p of names[key]) {
      const y = PAD_T + p.row * ROW;
      out += `<rect x='${p.x}' y='${y + 1}' width='1' height='8' opacity='.75'/>`;
      out += `<text x='${p.x + TICK}' y='${y + BASELINE}'>${esc(p.name)}</text>`;
    }
    return `${out}</g>`;
  };

  const svg =
    `<svg viewBox='0 0 ${VW} ${height}' width='100%' role='img' aria-labelledby='${titleId} ${descId}' style='display:block;overflow:visible'>` +
    `<title id='${titleId}'>Apron chart of ${total.toLocaleString("en-IN")} aircraft</title>` +
    `<desc id='${descId}'>Every aircraft on the DGCA operator lists, drawn as one glyph and parked in blocks by operator, largest operator first.</desc>` +
    glyphDefs() +
    layer("s", FILL_SCHEDULED) +
    layer("n", FILL_NONSCHEDULED) +
    nameLayer("s", FILL_SCHEDULED) +
    nameLayer("n", FILL_NONSCHEDULED) +
    `</svg>`;
  return { svg, height, width: VW };
}

export const APRON_FILL = { scheduled: FILL_SCHEDULED, nonScheduled: FILL_NONSCHEDULED };
