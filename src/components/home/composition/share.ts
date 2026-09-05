import type { Operator, Wing } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Shared drawing frame. Both figures use the same viewBox and centre  *
 * so the pair reads as two plates from one drawing set.               *
 * The centre is duplicated in composition.module.css (transform       *
 * origins); keep the two in step.                                     *
 * ------------------------------------------------------------------ */
export const VB_W = 560;
export const VB_H = 400;
export const CX = 280;
export const CY = 200;

/** Radii, outside in. */
export const R_OUT = 126; // nacelle outer lip / swept-disc boundary
export const R_LIP_IN = 116; // nacelle lip inner edge
export const R_TICK_OUT = 114; // per-cent scale, outer end of every tick
export const R_TICK_MIN = 110; // minor tick root (every 2 per cent)
export const R_TICK_MAJ = 106; // major tick root (every 10 per cent)
export const R_ANN_OUT = 104; // share annulus
export const R_ANN_IN = 90;
export const R_CASE = 88; // fan case / tip path circle
export const R_TIP = 86; // blade tips
export const R_ROOT = 36; // fan blade roots
export const R_SPIN = 32; // spinner

/** Callout frame. */
export const R_DOT = R_OUT; // leader starts on the outer boundary
export const R_ELBOW = 137;
export const LEAD_X_L = 130; // leader ends here, text sits to its left
export const LEAD_X_R = 430;
export const TEXT_X_L = 124;
export const TEXT_X_R = 436;
export const LINE_H = 13;
export const LABEL_GAP = 12;
export const LABEL_MIN_Y = 14;
export const LABEL_MAX_Y = VB_H - 14;
export const WRAP_CHARS = 14;

export const TOP_N = 6;
export const FAN_BLADES = 40;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [round2(cx + r * Math.cos(a)), round2(cy + r * Math.sin(a))];
}

/** Ring sector between two radii. */
export function annularSector(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, rOut, a0);
  const [x1, y1] = polar(cx, cy, rOut, a1);
  const [x2, y2] = polar(cx, cy, rIn, a1);
  const [x3, y3] = polar(cx, cy, rIn, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** One path holding every tick of the per-cent scale ring. */
export function tickRing(cx: number, cy: number, start: number, stepPct = 2): string {
  const parts: string[] = [];
  for (let i = 0; i < 100; i += stepPct) {
    const major = i % 10 === 0;
    const a = start + i * 3.6;
    const [x0, y0] = polar(cx, cy, major ? R_TICK_MAJ : R_TICK_MIN, a);
    const [x1, y1] = polar(cx, cy, R_TICK_OUT, a);
    parts.push(`M ${x0} ${y0} L ${x1} ${y1}`);
  }
  return parts.join(" ");
}

/** Swept wide-chord fan blade, root to tip, with a tip that follows the tip circle. */
export function fanBlade(cx: number, cy: number, a: number, chordRoot: number, chordTip: number, sweep: number): string {
  const rMid = (R_ROOT + R_TIP) / 2;
  const chordMid = (chordRoot + chordTip) / 2;
  const [x0, y0] = polar(cx, cy, R_ROOT, a);
  const [c0x, c0y] = polar(cx, cy, rMid, a + sweep * 0.55);
  const [x1, y1] = polar(cx, cy, R_TIP, a + sweep);
  const [x2, y2] = polar(cx, cy, R_TIP, a + sweep + chordTip);
  const [c1x, c1y] = polar(cx, cy, rMid, a + sweep * 0.55 + chordMid);
  const [x3, y3] = polar(cx, cy, R_ROOT, a + chordRoot);
  return `M ${x0} ${y0} Q ${c0x} ${c0y} ${x1} ${y1} A ${R_TIP} ${R_TIP} 0 0 1 ${x2} ${y2} Q ${c1x} ${c1y} ${x3} ${y3} Z`;
}

/** Straight tapered rotor blade with a rounded tip, drawn about the mast. */
export function rotorBlade(cx: number, cy: number, a: number, rRoot: number, rTip: number, halfRoot: number, halfTip: number): string {
  const rad = (a * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const vx = -Math.sin(rad);
  const vy = Math.cos(rad);
  const p = (r: number, o: number) => `${round2(cx + ux * r + vx * o)} ${round2(cy + uy * r + vy * o)}`;
  return [
    `M ${p(rRoot, halfRoot)}`,
    `L ${p(rTip - halfTip, halfTip)}`,
    `Q ${p(rTip + halfTip * 0.7, 0)} ${p(rTip - halfTip, -halfTip)}`,
    `L ${p(rRoot, -halfRoot)}`,
    "Z",
  ].join(" ");
}

/** Centre line of a rotor blade, drawn as a thin spar. */
export function bladeSpar(cx: number, cy: number, a: number, r0: number, r1: number): string {
  const [x0, y0] = polar(cx, cy, r0, a);
  const [x1, y1] = polar(cx, cy, r1, a);
  return `M ${x0} ${y0} L ${x1} ${y1}`;
}

/** Nose-cone spiral on the spinner. */
export function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, start: number): string {
  const steps = 40;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = r0 + (r1 - r0) * Math.pow(t, 0.9);
    const [x, y] = polar(cx, cy, r, start + t * turns * 360);
    pts.push(`${x} ${y}`);
  }
  return `M ${pts.join(" L ")}`;
}

/* ------------------------------------------------------------------ *
 * Shares                                                              *
 * ------------------------------------------------------------------ */

export interface Segment {
  key: string;
  name: string;
  count: number;
  pct: number;
  /** Start and end angle in degrees, 0 = three o'clock, increasing clockwise. */
  a0: number;
  a1: number;
  fill: number;
  others: boolean;
}

export interface Share {
  segments: Segment[];
  total: number;
  operators: number;
  /** Angle at which the first segment starts. */
  start: number;
}

/**
 * Top six operators of a wing plus one "others" segment. The start angle is
 * chosen so that the named segments straddle twelve o'clock and the others
 * segment is centred on six o'clock: that spreads the callouts evenly over
 * both sides of the drawing whatever the shape of the data.
 */
export function buildShare(operators: Operator[], wing: Wing, total: number): Share {
  const ranked = operators
    .filter((o) => (o.wings[wing] ?? 0) > 0)
    .map((o) => ({ id: o.id, name: o.name, count: o.wings[wing] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));

  const top = ranked.slice(0, TOP_N);
  const rest = ranked.length - top.length;
  const topSum = top.reduce((s, o) => s + o.count, 0);
  const othersCount = Math.max(0, total - topSum);

  const topSpan = (topSum / total) * 360;
  const start = -90 - topSpan / 2;

  const segments: Segment[] = [];
  let cum = 0;
  for (let i = 0; i < top.length; i++) {
    const o = top[i];
    const a0 = start + (cum / total) * 360;
    cum += o.count;
    segments.push({
      key: o.id,
      name: o.name,
      count: o.count,
      pct: (o.count / total) * 100,
      a0: round2(a0),
      a1: round2(start + (cum / total) * 360),
      fill: i,
      others: false,
    });
  }
  if (othersCount > 0) {
    segments.push({
      key: "others",
      name: `+${rest} others`,
      count: othersCount,
      pct: (othersCount / total) * 100,
      a0: round2(start + (cum / total) * 360),
      a1: round2(start + 360),
      fill: TOP_N,
      others: true,
    });
  }
  return { segments, total, operators: ranked.length, start };
}

/** Which segment owns each fan blade slot: the segment under the slot centre. */
export function bladeOwners(share: Share): number[] {
  const pitch = 360 / FAN_BLADES;
  const owners: number[] = [];
  for (let j = 0; j < FAN_BLADES; j++) {
    const centre = share.start + (j + 0.5) * pitch;
    let owner = share.segments.length - 1;
    for (let k = 0; k < share.segments.length; k++) {
      if (centre >= share.segments[k].a0 && centre < share.segments[k].a1) {
        owner = k;
        break;
      }
    }
    owners.push(owner);
  }
  return owners;
}

/* ------------------------------------------------------------------ *
 * Callouts                                                            *
 * ------------------------------------------------------------------ */

export interface Callout {
  key: string;
  lines: string[];
  pct: string;
  side: "L" | "R";
  /** Leader polyline. */
  d: string;
  dotX: number;
  dotY: number;
  textX: number;
  anchor: "start" | "end";
  /** Baseline of the first name line. */
  baseY: number;
  others: boolean;
}

/** Break a name into lines of at most `max` characters. Words are never cut. */
export function wrapName(name: string, max = WRAP_CHARS): string[] {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= max) cur = `${cur} ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function fmtPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

interface Block {
  seg: Segment;
  lines: string[];
  height: number;
  ideal: number;
  mid: number;
  top: number;
}

/** Push a column of label blocks apart so none overlap, then keep it on the sheet. */
function relax(blocks: Block[]): void {
  blocks.sort((a, b) => a.ideal - b.ideal || a.seg.a0 - b.seg.a0);
  for (const b of blocks) b.top = b.ideal - b.height / 2;
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1];
    blocks[i].top = Math.max(blocks[i].top, prev.top + prev.height + LABEL_GAP);
  }
  const last = blocks[blocks.length - 1];
  if (last) {
    const overflow = last.top + last.height - LABEL_MAX_Y;
    if (overflow > 0) for (const b of blocks) b.top -= overflow;
  }
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1];
    if (prev.top < LABEL_MIN_Y) prev.top = LABEL_MIN_Y;
    blocks[i].top = Math.max(blocks[i].top, prev.top + prev.height + LABEL_GAP);
  }
  if (blocks[0] && blocks[0].top < LABEL_MIN_Y) blocks[0].top = LABEL_MIN_Y;
}

export function layoutCallouts(share: Share): Callout[] {
  const left: Block[] = [];
  const right: Block[] = [];

  for (const seg of share.segments) {
    const mid = (seg.a0 + seg.a1) / 2;
    const lines = wrapName(seg.name);
    const height = (lines.length + 1) * LINE_H;
    const [, ey] = polar(CX, CY, R_ELBOW, mid);
    const block: Block = { seg, lines, height, ideal: ey, mid, top: ey };
    (Math.cos((mid * Math.PI) / 180) >= 0 ? right : left).push(block);
  }
  relax(left);
  relax(right);

  const out: Callout[] = [];
  for (const [side, blocks] of [["L", left], ["R", right]] as const) {
    for (const b of blocks) {
      const [dx, dy] = polar(CX, CY, R_DOT, b.mid);
      const [ex, ey] = polar(CX, CY, R_ELBOW, b.mid);
      const leadX = side === "L" ? LEAD_X_L : LEAD_X_R;
      const shelf = side === "L" ? leadX + 12 : leadX - 12;
      const midY = Math.round((b.top + b.height / 2) * 100) / 100;
      out.push({
        key: b.seg.key,
        lines: b.lines,
        pct: fmtPct(b.seg.pct),
        side,
        d: `M ${dx} ${dy} L ${ex} ${ey} L ${shelf} ${midY} L ${leadX} ${midY}`,
        dotX: dx,
        dotY: dy,
        textX: side === "L" ? TEXT_X_L : TEXT_X_R,
        anchor: side === "L" ? "end" : "start",
        baseY: Math.round((b.top + LINE_H - 3) * 100) / 100,
        others: b.seg.others,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Palette: tokens only. Signal is spent on the largest operator alone. *
 * ------------------------------------------------------------------ */

export function svgFills(prefix: string): string[] {
  return [
    "var(--signal)",
    "var(--ink)",
    `url(#${prefix}-hatch-ink)`,
    "var(--blue)",
    "var(--mint)",
    `url(#${prefix}-hatch-blue)`,
    "var(--paper-3)",
  ];
}

export const cssFills: string[] = [
  "var(--signal)",
  "var(--ink)",
  "repeating-linear-gradient(135deg, var(--ink) 0 1.2px, var(--paper-2) 1.2px 6px)",
  "var(--blue)",
  "var(--mint)",
  "repeating-linear-gradient(135deg, var(--blue) 0 1.2px, var(--paper-2) 1.2px 6px)",
  "var(--paper-3)",
];
