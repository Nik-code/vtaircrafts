import type { Wing } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { MARK_ID, markDefs } from "./glyphs";

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

/*
 * Drawing units. The SVG scales to its container (`width="100%"`), so these
 * are ratios, not pixels.
 *
 * The chart is a column waffle, one mark per aircraft: a fixed number of
 * rows, operators laid out left to right as rectangular blocks of columns
 * (largest operator first), each block filled top-to-bottom then
 * column-by-column, a one-column gap between blocks. Operators with fewer
 * than LABEL_MIN aircraft pool into one trailing block (their marks keep
 * their own operator's colour). The viewBox width is exactly the total
 * column count × PITCH, so the field fills its container edge to edge.
 */
const ROWS = 23; // Fixed row count. Chosen against the current fleet split
// (12 named operators plus a ~377-aircraft pool) so the field itself lands
// near a 3.2:1 width:height (900×276 at PITCH 12 for the current dataset).
const PITCH = 12; // column / row step
const MARK = round(PITCH * 0.72); // mark side, centred in its cell
const MARK_OFFSET = round((PITCH - MARK) / 2);
const BLOCK_GAP = 1; // one empty column between blocks

/** Operators smaller than this pool into one trailing mixed-colour block. */
const LABEL_MIN = 12;
/** Only the largest operators get a name callout above the field. */
const CALLOUT_COUNT = 8;

const NAME_SIZE = 12;
const NAME_TRACK = 0.4;
const CHAR_W = NAME_SIZE * 0.62; // rough mono advance, for collision-avoidance only
const SHELF_NEAR_Y = 27; // baseline, shelf closer to the field
const SHELF_FAR_Y = 12; // baseline, shelf further from the field
const LEADER_GAP = 4; // gap below a label's baseline before its leader starts
const FIELD_TOP = 40; // top of the dot matrix; every leader ends here
const BOTTOM_PAD = 22; // room below the field for the "and N more" label
const MIN_SHELF_GAP = 10; // x clearance kept between two labels on one shelf

/** Paper and mint-tinted paper, sitting on the blueprint ground. */
const FILL_SCHEDULED = "#EFEBE0";
const FILL_NONSCHEDULED = "#8DC2B7";
/** Dim paper: the quiet "and N more operators" label, not tied to one operator. */
const FILL_MORE = "rgba(243,240,232,0.55)";
const FILL_NAME = "#F3F0E8";
const STROKE_LEADER = "rgba(243,240,232,0.4)";

type FlowKey = "s" | "n";

interface Mark {
  x: number;
  y: number;
  key: FlowKey;
  a: ApronAircraft;
}

interface Callout {
  x: number;
  name: string;
  count: number;
  shelf: 0 | 1;
}

export interface ApronLayout {
  marks: Mark[];
  callouts: Callout[];
  more: { x: number; count: number } | null;
  cols: number;
  rows: number;
  width: number;
  height: number;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Lays every aircraft out as a column waffle and picks the label positions:
 * operators largest first, each a rectangular block of columns filled
 * top-to-bottom then column-by-column; operators under LABEL_MIN pool into
 * one trailing block, each mark still coloured by its own operator's
 * scheduled status. The CALLOUT_COUNT largest operators get a name + leader
 * above the field, alternated across two shelf heights — greedily, so a
 * label only leaves its preferred shelf when it would otherwise collide with
 * the previous label already sitting there.
 */
export function layoutApron(groups: ApronGroup[]): ApronLayout {
  const big = groups.filter((g) => g.aircraft.length >= LABEL_MIN);
  const small = groups.filter((g) => g.aircraft.length < LABEL_MIN);

  const marks: Mark[] = [];
  const blockCenters: { name: string; count: number; x: number }[] = [];
  let col = 0;

  const placeBlock = (aircraft: { a: ApronAircraft; key: FlowKey }[]) => {
    const cols = Math.max(1, Math.ceil(aircraft.length / ROWS));
    aircraft.forEach((item, i) => {
      const c = col + Math.floor(i / ROWS);
      const r = i % ROWS;
      marks.push({
        x: round(c * PITCH + MARK_OFFSET),
        y: round(r * PITCH + MARK_OFFSET),
        key: item.key,
        a: item.a,
      });
    });
    const center = round((col + cols / 2) * PITCH);
    col += cols + BLOCK_GAP;
    return center;
  };

  for (const g of big) {
    const key: FlowKey = g.scheduled ? "s" : "n";
    const center = placeBlock(g.aircraft.map((a) => ({ a, key })));
    blockCenters.push({ name: g.name, count: g.aircraft.length, x: center });
  }

  let more: { x: number; count: number } | null = null;
  if (small.length > 0) {
    const pooled = small.flatMap((g) =>
      g.aircraft.map((a) => ({ a, key: (g.scheduled ? "s" : "n") as FlowKey })),
    );
    more = { x: placeBlock(pooled), count: small.length };
  }
  // No trailing gap after the last block.
  const cols = col > 0 ? col - BLOCK_GAP : 0;

  // The callouts are a prefix of `big` (already largest-first).
  const shelfEnd: [number, number] = [-Infinity, -Infinity];
  // A label that fits neither shelf is dropped rather than drawn over its neighbour:
  // the largest operators come first, so what is lost is always the smallest block.
  const callouts: Callout[] = blockCenters.slice(0, CALLOUT_COUNT).flatMap((b, i) => {
    const label = `${b.name.toUpperCase()} ${fmtInt(b.count)}`;
    const w = label.length * CHAR_W;
    const preferred = (i % 2) as 0 | 1;
    const other = (1 - preferred) as 0 | 1;
    const fits = (s: 0 | 1) => b.x >= shelfEnd[s] + MIN_SHELF_GAP;
    const shelf = fits(preferred) ? preferred : fits(other) ? other : null;
    if (shelf === null) return [];
    shelfEnd[shelf] = Math.max(shelfEnd[shelf], b.x) + w;
    return [{ x: b.x, name: b.name, count: b.count, shelf }];
  });

  const width = cols * PITCH;
  const height = FIELD_TOP + ROWS * PITCH + (more ? BOTTOM_PAD : 0);

  return { marks, callouts, more, cols, rows: ROWS, width, height };
}

/**
 * Serialises the whole apron as one SVG string, written by hand rather than
 * as JSX so anchors cost few bytes each: rows share one `<g>` (and so one
 * y), fill lives on the layer, and each mark only spends bytes on its own
 * href, title and x position.
 */
export function apronSvg(groups: ApronGroup[], titleId: string, descId: string) {
  const layout = layoutApron(groups);
  const { marks, callouts, more, width, height, rows } = layout;
  const total = marks.length;

  const layer = (key: FlowKey, fill: string) => {
    const byRow = new Map<number, Mark[]>();
    for (const m of marks) {
      if (m.key !== key) continue;
      const list = byRow.get(m.y);
      if (list) list.push(m);
      else byRow.set(m.y, [m]);
    }
    let out = `<g fill='${fill}'>`;
    for (const [y, list] of byRow) {
      out += `<g transform='translate(0,${FIELD_TOP + y})'>`;
      for (const m of list) {
        out += `<a href='/aircraft/${m.a.reg}'><title>${esc(m.a.reg)} · ${esc(m.a.type)}</title><use x='${m.x}' href='#${MARK_ID[m.a.wing]}'/></a>`;
      }
      out += `</g>`;
    }
    return `${out}</g>`;
  };

  const calloutLayer = () => {
    if (callouts.length === 0) return "";
    let out = `<g font-size='${NAME_SIZE}' letter-spacing='${NAME_TRACK}'>`;
    for (const c of callouts) {
      const baseline = c.shelf === 0 ? SHELF_NEAR_Y : SHELF_FAR_Y;
      const leaderStart = baseline + LEADER_GAP;
      out += `<line x1='${c.x}' y1='${leaderStart}' x2='${c.x}' y2='${FIELD_TOP}' stroke='${STROKE_LEADER}'/>`;
      out += `<circle cx='${c.x}' cy='${FIELD_TOP}' r='1.2' fill='${STROKE_LEADER}'/>`;
      out += `<text x='${c.x}' y='${baseline}' fill='${FILL_NAME}'><tspan fill-opacity='.85'>${esc(c.name.toUpperCase())}</tspan><tspan fill-opacity='.55'> ${fmtInt(c.count)}</tspan></text>`;
    }
    return `${out}</g>`;
  };

  const moreLabel = () => {
    if (!more) return "";
    const y = FIELD_TOP + rows * PITCH + BOTTOM_PAD - 8;
    return `<text x='${width}' y='${y}' text-anchor='end' font-style='italic' font-size='${NAME_SIZE}' fill='${FILL_MORE}'>and ${fmtInt(more.count)} more operators</text>`;
  };

  /*
   * The chart is served standalone (see src/app/apron.svg/route.ts) and
   * injected into the page as a plain markup string, so it carries its own
   * font stack and hover style rather than depending on page CSS reaching an
   * injected-then-hydrated string. `var(--font-mono)` resolves when the
   * markup lands inside the live page; the literal fallback keeps text
   * readable when the SVG is viewed on its own.
   */
  const style =
    `<style>` +
    `text{font-family:var(--font-mono,'Azeret Mono',ui-monospace,monospace)}` +
    `use{transition:fill 150ms}` +
    `a:hover use{fill:#FF4F00}` +
    `@media (prefers-reduced-motion: reduce){use{transition:none}}` +
    `</style>`;

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='100%' preserveAspectRatio='xMidYMin meet' role='img' aria-labelledby='${titleId} ${descId}' style='display:block;overflow:visible'>` +
    `<title id='${titleId}'>Apron chart of ${fmtInt(total)} aircraft</title>` +
    `<desc id='${descId}'>Every aircraft on the DGCA operator lists, drawn as one mark and parked in blocks by operator, largest operator first. Operators with fewer than ${LABEL_MIN} aircraft are grouped into one pooled block.</desc>` +
    style +
    markDefs(MARK) +
    layer("s", FILL_SCHEDULED) +
    layer("n", FILL_NONSCHEDULED) +
    calloutLayer() +
    moreLabel() +
    `</svg>`;
  return { svg, height, width };
}

export const APRON_FILL = { scheduled: FILL_SCHEDULED, nonScheduled: FILL_NONSCHEDULED };
