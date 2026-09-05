import type { TypeRow } from "../derive";
import { planformAspect } from "./planforms";

/**
 * Geometry for the "flight line" drawing: the top types parked nose-to-tail on
 * an apron, each pictogram bottom-aligned to one ground datum and scaled by
 * fleet count, with its own callout (leader line + label + count) above it.
 *
 * The viewBox width is fixed at `VIEW_W`, which is close to the drawing's
 * rendered width on a 1440px screen (the sheet is 1440px minus the page and
 * section gutters, about 1330px). Type sizes are fitted into that frame rather
 * than the frame growing to fit them, so the label and numeral sizes below are
 * effectively css pixels: 12.5 units of label renders at about 12.8px, the
 * counts at about 26px and the stand numbers at about 11px.
 */
export interface FlightLineItem {
  row: TypeRow;
  /** 1-based position, left to right. Also the apron stand number. */
  number: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  /** The single largest type on the whole sheet, not just among the drawn rows. */
  highlight: boolean;
  /** 0 = near shelf (just above the aircraft), 1 = far shelf (a row higher).
   *  Alternates so neighbouring callouts never share a shelf. */
  calloutRow: 0 | 1;
  /** The type name, uppercased and pre-wrapped to 1 or 2 lines so it never
   *  truncates. */
  nameLines: string[];
  /** Baseline y of the first (topmost) name line; the second, if any, is one
   *  `labelLineH` below it. */
  labelY: number;
  /** Baseline y of the count numeral, below the name line(s). */
  countY: number;
  /** Leader line runs from (cx, leaderTopY) down to the pictogram. */
  leaderTopY: number;
}

export interface FlightLineLayout {
  items: FlightLineItem[];
  vw: number;
  vh: number;
  /** Ground line every pictogram's undercarriage rests on. */
  baseline: number;
  /** Bottom edge of the apron pavement band below the baseline. */
  apronBottom: number;
  centerlineY: number;
  /** Baseline y for the faint apron stand numbers ("01".."12"). */
  standY: number;
  labelLineH: number;
  labelFontSize: number;
  /** Letter-spacing for the labels, in viewBox units. */
  labelTracking: number;
  countFontSize: number;
  standFontSize: number;
}

/** Fixed frame width. Maps roughly 1:1 to css pixels at 1440px. */
const VIEW_W = 1300;
const MARGIN_X = 16;

const LABEL_FONT_SIZE = 12.5;
/** 0.06em, tighter than the global `.label` rule so long type names fit on the
 *  flight line without dropping below a readable size. */
const LABEL_TRACKING = LABEL_FONT_SIZE * 0.06;
/** Azeret Mono advances 0.6em per glyph, plus the tracking above. */
const LABEL_CHAR_W = LABEL_FONT_SIZE * 0.6 + LABEL_TRACKING;
const LABEL_LINE_H = 16;
const COUNT_FONT_SIZE = 26;
/** Barlow Condensed tabular digits run about 0.5em wide. */
const COUNT_CHAR_W = COUNT_FONT_SIZE * 0.52;
const STAND_FONT_SIZE = 11;
/** A name wider than this wraps to two lines. */
const MAX_LABEL_LINE_W = 108;
const LABEL_COUNT_GAP = 6;

/** Pictogram footprint range, in viewBox units, before the fit-to-frame pass. */
const MIN_W = 62;
const MAX_W = 176;
/** Minimum clear air between two neighbouring pictograms. */
const GAP = 14;
/** Minimum clearance between the label blocks of same-shelf neighbours. */
const LABEL_GAP = 14;

const TOP_PAD = 4;
/** Clear air between the far shelf's count baseline and the near shelf's
 *  label block, so the two shelves never overlap vertically at all. */
const SHELF_PAD = 10;
/** Gap from a count baseline down to the start of that shelf's leader line. */
const LEADER_PAD = 5;
/** Clear air between the near shelf's count baseline and the tallest aircraft. */
const SIL_PAD = 26;

const APRON_H = 36;
const STAND_INSET = 13;
const BOTTOM_PAD = 12;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function lineWidth(line: string) {
  return line.length * LABEL_CHAR_W;
}

/** Wraps a name onto two lines at the word boundary that makes the wider of
 *  the two lines as narrow as possible. Never drops or truncates a word. */
function wrapName(raw: string): string[] {
  const name = raw.toUpperCase();
  if (lineWidth(name) <= MAX_LABEL_LINE_W) return [name];
  const words = name.split(" ");
  if (words.length < 2) return [name];
  let best: string[] = [name];
  let bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const w = Math.max(lineWidth(a), lineWidth(b));
    if (w < bestW) {
      bestW = w;
      best = [a, b];
    }
  }
  return best;
}

/** Centre-to-centre distances for one trial pictogram scale. Neighbouring
 *  pictograms must clear each other, and same-shelf neighbours (i and i-2,
 *  since shelves strictly alternate) must clear each other's label block. */
function spacing(widths: number[], footprints: number[]): number[] {
  const d: number[] = [];
  for (let i = 1; i < widths.length; i++) {
    let need = (widths[i - 1] + widths[i]) / 2 + GAP;
    if (i >= 2) {
      const shelfNeed = (footprints[i - 2] + footprints[i]) / 2 + LABEL_GAP;
      if (d[i - 2] + need < shelfNeed) need = shelfNeed - d[i - 2];
    }
    d.push(need);
  }
  return d;
}

/** End allowance: the outer items must fit their label block inside the frame,
 *  not just their pictogram. */
function endHalf(widths: number[], footprints: number[], i: number) {
  return Math.max(widths[i] / 2, footprints[i] / 2);
}

function totalWidth(widths: number[], footprints: number[], d: number[]) {
  const sum = d.reduce((a, b) => a + b, 0);
  const last = widths.length - 1;
  return endHalf(widths, footprints, 0) + sum + endHalf(widths, footprints, last) + 2 * MARGIN_X;
}

/**
 * Lays out `rows` left to right, largest fleet count first, inside a fixed
 * `VIEW_W` frame. Footprint is scaled by sqrt(count) so the drawn *area*
 * roughly tracks fleet count, with a floor and ceiling so every pictogram
 * stays legible; it is a fleet-count icon, not a scale model. Each item gets a
 * leader-line callout on one of two shelves, and the shelves are far enough
 * apart vertically that adjacent callouts can never collide.
 */
export function layoutFlightLine(rows: TypeRow[], highlightName: string): FlightLineLayout {
  const counts = rows.map((r) => r.count);
  const maxCount = Math.max(...counts, 1);
  const minCount = Math.min(...counts, maxCount);
  const sMax = Math.sqrt(maxCount);
  const sMin = Math.sqrt(minCount);
  const span = sMax - sMin;

  // t in [0, 1]: 0 = smallest fleet in the drawn set, 1 = the largest.
  const ts = rows.map((r) => (span > 0 ? (Math.sqrt(r.count) - sMin) / span : 1));
  const baseWidths = ts.map((t) => MIN_W + t * (MAX_W - MIN_W));

  const nameLinesByRow = rows.map((r) => wrapName(r.name));
  const footprints = rows.map((r, i) => {
    const nameW = Math.max(...nameLinesByRow[i].map(lineWidth));
    const countW = String(r.count).length * COUNT_CHAR_W;
    return Math.max(nameW, countW);
  });
  const calloutRows = rows.map((_, i) => (i % 2) as 0 | 1);

  // Fit the line to the frame: shrink the pictograms until the row fits, since
  // the label blocks cannot shrink without going under 12px on screen. Twenty
  // bisection steps settle the scale to well under a tenth of a unit.
  const fits = (f: number) => {
    const w = baseWidths.map((v) => v * f);
    return totalWidth(w, footprints, spacing(w, footprints));
  };
  let scale = 1;
  if (rows.length > 1 && fits(1) > VIEW_W) {
    let lo = 0.3;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid) <= VIEW_W) lo = mid;
      else hi = mid;
    }
    scale = lo;
  }
  const widths = baseWidths.map((v) => v * scale);
  const d = spacing(widths, footprints);

  // Spread whatever is left over evenly between the aircraft.
  const slack = VIEW_W - totalWidth(widths, footprints, d);
  if (slack > 0 && d.length > 0) {
    const share = slack / d.length;
    for (let i = 0; i < d.length; i++) d[i] += share;
  }

  const cx: number[] = [
    d.length === 0 ? VIEW_W / 2 : MARGIN_X + endHalf(widths, footprints, 0),
  ];
  for (let i = 1; i < rows.length; i++) cx.push(cx[i - 1] + d[i - 1]);

  // Each type keeps its own drawing's real aspect ratio (span/length for fixed
  // wing, rotor-diameter/length for rotorcraft) instead of one fixed ratio.
  const aspects = rows.map((r) => planformAspect(r.icao, r.wing));
  const heights = widths.map((w, i) => w * aspects[i]);
  const maxHeight = Math.max(...heights, MIN_W);

  // Vertical stack, top to bottom: far-shelf callouts, near-shelf callouts,
  // pictograms (bottom-aligned to `baseline`), apron band, stand numbers.
  // A shelf's block runs from the top of its tallest label up to its count
  // baseline; the two blocks are stacked, never interleaved.
  const blockH = (lines: number) => LABEL_FONT_SIZE + (lines - 1) * LABEL_LINE_H + LABEL_COUNT_GAP + COUNT_FONT_SIZE;
  const linesOn = (shelf: 0 | 1) =>
    rows.reduce((worst, _, i) => (calloutRows[i] === shelf ? Math.max(worst, nameLinesByRow[i].length) : worst), 1);
  const farCountY = TOP_PAD + blockH(linesOn(1));
  const nearCountY = farCountY + blockH(linesOn(0)) + SHELF_PAD;
  const silTop = nearCountY + SIL_PAD;
  const baseline = silTop + maxHeight;

  const items: FlightLineItem[] = rows.map((row, i) => {
    const w = widths[i];
    const h = heights[i];
    const calloutRow = calloutRows[i];
    const countY = calloutRow === 0 ? nearCountY : farCountY;
    const lines = nameLinesByRow[i];
    const labelY = countY - COUNT_FONT_SIZE - LABEL_COUNT_GAP - (lines.length - 1) * LABEL_LINE_H;
    return {
      row,
      number: i + 1,
      x: round2(cx[i] - w / 2),
      y: round2(baseline - h),
      w: round2(w),
      h: round2(h),
      cx: round2(cx[i]),
      highlight: row.name === highlightName,
      calloutRow,
      nameLines: lines,
      labelY: round2(labelY),
      countY: round2(countY),
      leaderTopY: round2(countY + LEADER_PAD),
    };
  });

  const apronBottom = baseline + APRON_H;
  return {
    items,
    vw: VIEW_W,
    vh: round2(apronBottom + BOTTOM_PAD),
    baseline: round2(baseline),
    apronBottom: round2(apronBottom),
    centerlineY: round2(baseline + APRON_H / 2),
    standY: round2(apronBottom - STAND_INSET),
    labelLineH: LABEL_LINE_H,
    labelFontSize: LABEL_FONT_SIZE,
    labelTracking: round2(LABEL_TRACKING),
    countFontSize: COUNT_FONT_SIZE,
    standFontSize: STAND_FONT_SIZE,
  };
}
