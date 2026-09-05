import type { TypeRow } from "../derive";

/**
 * Geometry for the "flight line" drawing: the top types parked nose-to-tail on
 * an apron, each silhouette bottom-aligned to one ground datum and scaled by
 * fleet count, with its own callout (leader line + label + count) above it.
 * All units are SVG user-space; the caller sizes the SVG to `vw`x`vh` and lets
 * the viewBox scale it fluidly.
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
  /** Outline weight for this silhouette, in its own 200x120 user units: scales
   *  with drawn size from STROKE_MIN up to STROKE_MAX at MAX_W. */
  strokeWidth: number;
  /** The single largest type on the whole sheet, not just among the drawn rows. */
  highlight: boolean;
  /** 0 = short leader, label sits just above the tallest silhouettes.
   *  1 = long leader, label sits a further row up. Alternates so neighbouring
   *  callouts never share a shelf. */
  calloutRow: 0 | 1;
  /** The type name, pre-wrapped to 1 or 2 lines so it never truncates. */
  nameLines: string[];
  /** Baseline y of the first (topmost) name line; the second, if any, is one
   *  `LABEL_LINE_H` below it. */
  labelY: number;
  /** Baseline y of the count numeral, below the name line(s). */
  countY: number;
  /** Leader line runs from (cx, leaderTopY) down to (cx, y - LEADER_STUB). */
  leaderTopY: number;
}

export interface FlightLineLayout {
  items: FlightLineItem[];
  vw: number;
  vh: number;
  /** Ground line every silhouette's undercarriage rests on. */
  baseline: number;
  /** Bottom edge of the apron pavement band below the baseline. */
  apronBottom: number;
  centerlineY: number;
  /** Baseline y for the faint apron stand numbers ("01".."12"). */
  standY: number;
  labelLineH: number;
  labelFontSize: number;
  countFontSize: number;
}

const MIN_W = 90;
const MAX_W = 260;
/** height / width, matching Silhouette's own 200x120 viewBox. */
const ASPECT = 0.6;
const GAP = 22;
const MARGIN_X = 20;
/** Minimum label-footprint clearance between same-shelf neighbours (i, i-2). */
const LABEL_GAP = 12;
/** Minimum label-footprint clearance between adjacent silhouettes (i, i-1),
 *  which sit on opposite shelves; smaller than LABEL_GAP because the shelves'
 *  own vertical offset already buys some separation. */
const ADJACENT_GAP = 8;

/** ~7px per uppercase mono character at 11px, per DESIGN.md's `.label` type. */
const CHAR_W = 7;
const LABEL_FONT_SIZE = 11;
const LABEL_LINE_H = 14;
const COUNT_FONT_SIZE = 22;
const COUNT_CHAR_W = 13;
/** Roughly the widest a single label line is allowed to get before wrapping.
 *  Kept generous so real DGCA type names stay on one line (the horizontal
 *  collision checks below adapt to whatever width results either way); a
 *  2-line wrap is a rare fallback, not the common case. */
const MAX_LABEL_LINE_W = 170;
const LABEL_COUNT_GAP = 5;

/** Margin above the far shelf's own (possibly 2-line) label block. */
const ROW_TOP_PAD = 4;
/** Gap from a shelf's count baseline down to where its leader line starts. */
const LEADER_PAD = 4;
/** How far above the tallest silhouette's top each shelf's count numeral sits. */
const NEAR_ABOVE_SIL = 24;
const FAR_ABOVE_SIL = 44;

const APRON_H = 32;
const STAND_INSET = 12;
const BOTTOM_PAD = 10;

/** Silhouette outline weight range, in the silhouette's own user units. */
const STROKE_MIN = 1.1;
const STROKE_MAX = 1.6;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Splits an already-known-too-wide name into two lines at a word boundary,
 * greedily packing the first line. Never drops or truncates a word. */
function wrapName(name: string): string[] {
  if (name.length * CHAR_W <= MAX_LABEL_LINE_W) return [name];
  const words = name.split(" ");
  if (words.length < 2) return [name];

  const line1: string[] = [];
  let w1 = 0;
  let i = 0;
  for (; i < words.length; i++) {
    const addW = words[i].length * CHAR_W + (line1.length > 0 ? CHAR_W : 0);
    if (line1.length > 0 && w1 + addW > MAX_LABEL_LINE_W) break;
    line1.push(words[i]);
    w1 += addW;
  }
  if (line1.length === 0) {
    line1.push(words[0]);
    i = 1;
  }
  const line2 = words.slice(i);
  return line2.length === 0 ? [line1.join(" ")] : [line1.join(" "), line2.join(" ")];
}

function lineWidth(line: string) {
  return line.length * CHAR_W;
}

/**
 * Lays out `rows` left to right, largest fleet count first. Width is scaled by
 * sqrt(count) so the drawn *area* roughly tracks fleet count, with a floor and
 * ceiling so every silhouette stays legible; it is a fleet-count icon, not a
 * scale model. Each item gets a leader-line callout, alternating between two
 * shelf heights so long neighbouring labels never overlap; a same-shelf pair
 * that would still collide (checked against each label's measured width) pushes
 * everything from that point rightward rather than crowding.
 */
export function layoutFlightLine(rows: TypeRow[], highlightName: string): FlightLineLayout {
  const counts = rows.map((r) => r.count);
  const maxCount = Math.max(...counts, 1);
  const minCount = Math.min(...counts, maxCount);
  const sMax = Math.sqrt(maxCount);
  const sMin = Math.sqrt(minCount);
  const span = sMax - sMin;

  // t in [0, 1]: 0 = smallest fleet in the drawn set, 1 = the largest. Drives
  // both the silhouette's footprint and (below) its outline weight.
  const ts = rows.map((r) => (span > 0 ? (Math.sqrt(r.count) - sMin) / span : 1));
  const widths = ts.map((t) => MIN_W + t * (MAX_W - MIN_W));
  const strokeWidths = ts.map((t) => round2(STROKE_MIN + t * (STROKE_MAX - STROKE_MIN)));
  const maxWidth = Math.max(...widths, MIN_W);
  const maxHeight = maxWidth * ASPECT;

  const nameLinesByRow = rows.map((r) => wrapName(r.name));
  const footprints = rows.map((r, i) => {
    const nameW = Math.max(...nameLinesByRow[i].map(lineWidth));
    const countW = String(r.count).length * COUNT_CHAR_W;
    return Math.max(nameW, countW);
  });
  const calloutRows = rows.map((_, i) => (i % 2) as 0 | 1);

  // Vertical stack, top to bottom: far-shelf callout, near-shelf callout,
  // silhouettes (bottom-aligned to `baseline`), apron band, stand numbers.
  // Both shelves' count numerals sit a fixed distance above the *tallest*
  // silhouette's top (NEAR_ABOVE_SIL / FAR_ABOVE_SIL); `topSpan` is the
  // distance from a shelf's count baseline up to the top of its own label
  // block, sized to the tallest label actually parked on that shelf (only a
  // 2-line name needs the extra LABEL_LINE_H) so the drawing doesn't carry
  // headroom for a wrap that never happens.
  const topSpan1 = COUNT_FONT_SIZE + LABEL_COUNT_GAP + LABEL_FONT_SIZE;
  const topSpan2 = topSpan1 + LABEL_LINE_H;
  const topSpanOf = (i: number) => (nameLinesByRow[i].length === 2 ? topSpan2 : topSpan1);
  const farTopSpan = rows.reduce(
    (worst, _, i) => (calloutRows[i] === 1 ? Math.max(worst, topSpanOf(i)) : worst),
    topSpan1,
  );
  const silTop = ROW_TOP_PAD + farTopSpan + FAR_ABOVE_SIL;
  const farY = silTop - FAR_ABOVE_SIL;
  const nearY = silTop - NEAR_ABOVE_SIL;
  const farLeaderTop = farY + LEADER_PAD;
  const nearLeaderTop = nearY + LEADER_PAD;
  const baseline = silTop + maxHeight;

  // Pass 1: place silhouettes nose to tail with a fixed base gap.
  let cursor = MARGIN_X;
  const x = widths.map((w) => {
    const thisX = cursor;
    cursor += w + GAP;
    return thisX;
  });
  const cxOf = (i: number) => x[i] + widths[i] / 2;

  // Pass 2: immediate neighbours (i and i-1) sit on opposite shelves, only
  // ROW_CLEARANCE-ish pixels apart vertically now, so their label footprints
  // must also clear each other horizontally; push right when they would not.
  for (let i = 1; i < rows.length; i++) {
    const prev = i - 1;
    const minCenterDist = footprints[prev] / 2 + footprints[i] / 2 + ADJACENT_GAP;
    const curDist = cxOf(i) - cxOf(prev);
    if (curDist < minCenterDist) {
      const shift = minCenterDist - curDist;
      for (let j = i; j < rows.length; j++) x[j] += shift;
    }
  }

  // Pass 3: same-shelf neighbours (i and i-2, since rows strictly alternate)
  // must clear each other's label footprint; push right when they would not.
  for (let i = 2; i < rows.length; i++) {
    const prev = i - 2;
    const minCenterDist = footprints[prev] / 2 + footprints[i] / 2 + LABEL_GAP;
    const curDist = cxOf(i) - cxOf(prev);
    if (curDist < minCenterDist) {
      const shift = minCenterDist - curDist;
      for (let j = i; j < rows.length; j++) x[j] += shift;
    }
  }

  const items: FlightLineItem[] = rows.map((row, i) => {
    const w = widths[i];
    const h = w * ASPECT;
    const y = baseline - h;
    const cx = x[i] + w / 2;
    const calloutRow = calloutRows[i];
    const shelfY = calloutRow === 0 ? nearY : farY;
    const leaderTopY = calloutRow === 0 ? nearLeaderTop : farLeaderTop;
    const lines = nameLinesByRow[i];
    const lastLabelBaseline = shelfY - COUNT_FONT_SIZE - LABEL_COUNT_GAP;
    const labelY = lastLabelBaseline - (lines.length - 1) * LABEL_LINE_H;
    const countY = shelfY;
    return {
      row,
      number: i + 1,
      x: round2(x[i]),
      y: round2(y),
      w: round2(w),
      h: round2(h),
      cx: round2(cx),
      strokeWidth: strokeWidths[i],
      highlight: row.name === highlightName,
      calloutRow,
      nameLines: lines,
      labelY: round2(labelY),
      countY: round2(countY),
      leaderTopY: round2(leaderTopY),
    };
  });

  const lastRight = x[x.length - 1] + widths[widths.length - 1];
  const vw = round2(lastRight + MARGIN_X);
  const apronBottom = baseline + APRON_H;
  const vh = round2(apronBottom + BOTTOM_PAD);

  return {
    items,
    vw,
    vh,
    baseline: round2(baseline),
    apronBottom: round2(apronBottom),
    centerlineY: round2(baseline + APRON_H / 2),
    standY: round2(apronBottom - STAND_INSET),
    labelLineH: LABEL_LINE_H,
    labelFontSize: LABEL_FONT_SIZE,
    countFontSize: COUNT_FONT_SIZE,
  };
}
