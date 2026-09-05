/**
 * Path primitives for the parametric planform generator.
 *
 * Everything is built in metres, nose-up (the nose sits at the smallest y, so
 * "up" on screen is -y), symmetric about x = 0, out of straight segments and
 * cubic curves only. `buildPaths` measures the finished geometry, shifts it so
 * its bounding box starts at the origin and emits path strings rounded to two
 * decimals, so server and client render identical markup.
 */

export type Pt = readonly [number, number];

export type Seg =
  | { readonly t: "M"; readonly p: Pt }
  | { readonly t: "L"; readonly p: Pt }
  | { readonly t: "C"; readonly a: Pt; readonly b: Pt; readonly p: Pt }
  | { readonly t: "Z" };

/** One outline: a run of segments, closed with Z. */
export type Chain = Seg[];
/** One `<path>`: subpaths that never overlap each other, except a deliberate
 *  hole (fenestron ring), which the shared `fill-rule: evenodd` cuts out. */
export type Shape = Chain[];

const K = 0.5522847498;

/** Rounds half away from zero, so a coordinate and its mirror stay exact
 *  opposites and the drawing cannot lose its symmetry to rounding. */
function rint(n: number) {
  const v = n < 0 ? -Math.round(-n) : Math.round(n);
  return v === 0 ? 0 : v;
}

/** Mirrors an open chain about the centreline and reverses it, so a half
 *  outline can be closed into an exactly symmetric whole. */
function mirrored(chain: Chain): Chain {
  const nodes: Pt[] = [];
  const ctrl: (readonly [Pt, Pt] | null)[] = [];
  for (const s of chain) {
    if (s.t === "M") nodes.push(s.p);
    else if (s.t === "L") {
      nodes.push(s.p);
      ctrl.push(null);
    } else if (s.t === "C") {
      nodes.push(s.p);
      ctrl.push([s.a, s.b] as const);
    }
  }
  const m = (p: Pt): Pt => [-p[0], p[1]];
  const out: Chain = [];
  const last = nodes[nodes.length - 1];
  if (Math.abs(last[0]) > 1e-9) out.push({ t: "L", p: m(last) });
  for (let i = nodes.length - 1; i > 0; i--) {
    const c = ctrl[i - 1];
    out.push(c ? { t: "C", a: m(c[1]), b: m(c[0]), p: m(nodes[i - 1]) } : { t: "L", p: m(nodes[i - 1]) });
  }
  out.push({ t: "Z" });
  return out;
}

/** Closes a right-hand half outline into a full, exactly symmetric shape. */
export function symmetric(half: Chain): Chain {
  return [...half, ...mirrored(half)];
}

export function circle(cx: number, cy: number, r: number): Chain {
  return [
    { t: "M", p: [cx, cy - r] },
    { t: "C", a: [cx + r * K, cy - r], b: [cx + r, cy - r * K], p: [cx + r, cy] },
    { t: "C", a: [cx + r, cy + r * K], b: [cx + r * K, cy + r], p: [cx, cy + r] },
    { t: "C", a: [cx - r * K, cy + r], b: [cx - r, cy + r * K], p: [cx - r, cy] },
    { t: "C", a: [cx - r, cy - r * K], b: [cx - r * K, cy - r], p: [cx, cy - r] },
    { t: "Z" },
  ];
}

/** A longitudinal bar with rounded ends: nacelles, fins, skids, tail booms. */
export function capsule(cx: number, y0: number, y1: number, w: number): Chain {
  const h = w / 2;
  const cap = Math.min(h, (y1 - y0) / 2);
  return [
    { t: "M", p: [cx - h, y0 + cap] },
    { t: "C", a: [cx - h, y0 + cap - cap * K], b: [cx - h * K, y0], p: [cx, y0] },
    { t: "C", a: [cx + h * K, y0], b: [cx + h, y0 + cap - cap * K], p: [cx + h, y0 + cap] },
    { t: "L", p: [cx + h, y1 - cap] },
    { t: "C", a: [cx + h, y1 - cap + cap * K], b: [cx + h * K, y1], p: [cx, y1] },
    { t: "C", a: [cx - h * K, y1], b: [cx - h, y1 - cap + cap * K], p: [cx - h, y1 - cap] },
    { t: "Z" },
  ];
}

/**
 * A lifting surface, symmetric about the centreline: straight swept leading
 * edge with a slight forward bow, square tip, gently curved trailing edge.
 * `leRootY` is the leading edge at the centreline; `sweep` is leading-edge
 * sweep in degrees.
 */
export function wing(leRootY: number, rootChord: number, halfSpan: number, tipChord: number, sweep: number): Chain {
  const dy = Math.tan((sweep * Math.PI) / 180) * halfSpan;
  const leTipY = leRootY + dy;
  const teRootY = leRootY + rootChord;
  const teTipY = leTipY + tipChord;
  const half: Chain = [
    { t: "M", p: [0, leRootY] },
    { t: "C", a: [halfSpan * 0.33, leRootY + dy * 0.27], b: [halfSpan * 0.7, leRootY + dy * 0.66], p: [halfSpan, leTipY] },
    { t: "L", p: [halfSpan, teTipY] },
    {
      t: "C",
      a: [halfSpan * 0.62, teRootY + (teTipY - teRootY) * 0.5],
      b: [halfSpan * 0.26, teRootY + (teTipY - teRootY) * 0.07],
      p: [0, teRootY],
    },
  ];
  return symmetric(half);
}

/** How far aft of its leading-edge root a lifting surface reaches. */
export function wingAft(rootChord: number, halfSpan: number, tipChord: number, sweep: number) {
  const dy = Math.tan((sweep * Math.PI) / 180) * halfSpan;
  return Math.max(rootChord, dy + tipChord);
}

/** The same surface, positioned by its aft-most point instead of its root. */
export function wingAtRear(rearY: number, rootChord: number, halfSpan: number, tipChord: number, sweep: number): Chain {
  return wing(rearY - wingAft(rootChord, halfSpan, tipChord, sweep), rootChord, halfSpan, tipChord, sweep);
}

/**
 * `n` solid blades radiating from a hub, tapering from `rootW` to `tipW` with
 * a rounded tip, the outermost point exactly `r1` from the hub. Used for both
 * main rotors and propeller discs so rotorcraft and turboprops share a look.
 */
export function bladeDisc(
  cx: number,
  cy: number,
  n: number,
  r0: number,
  r1: number,
  rootW: number,
  tipW: number,
  phase: number,
): Chain[] {
  const out: Chain[] = [];
  const tip = Math.min(tipW / 2, (r1 - r0) / 2);
  for (let i = 0; i < n; i++) {
    const a = phase + (i * 2 * Math.PI) / n;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    const px = -uy;
    const py = ux;
    const P = (rad: number, off: number): Pt => [cx + ux * rad + px * off, cy + uy * rad + py * off];
    out.push([
      { t: "M", p: P(r0, rootW / 2) },
      { t: "L", p: P(r1 - tip, tipW / 2) },
      { t: "C", a: P(r1, tipW / 2), b: P(r1, -tipW / 2), p: P(r1 - tip, -tipW / 2) },
      { t: "L", p: P(r0, -rootW / 2) },
      { t: "Z" },
    ]);
  }
  return out;
}

/** Blade phase that keeps every blade off the fuselage axis, whatever the
 *  blade count, so a rotor never reads as a pair of swept wings. */
export function bladePhase(n: number) {
  return Math.PI / (2 * n);
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Drawing width every planform is normalised to. Geometry is authored in
 *  metres; at 200 units wide, one unit is well under a pixel at the size these
 *  are drawn, so every coordinate can be an integer. */
const UNITS = 200;

/**
 * Measures every point (curve control points included, so the box is never
 * tight enough to clip), normalises the drawing to `UNITS` wide and emits one
 * path string per part plus the viewBox that exactly contains them. `extra`
 * widens the box to something the drawn points do not reach on their own: a
 * rotorcraft's swept rotor disc, so the viewBox width is the rotor diameter
 * however the blades happen to be phased.
 */
export function buildPaths(shapes: Shape[], extra?: Bounds): { viewBox: string; paths: string[] } {
  let minX = extra ? extra.minX : Infinity;
  let minY = extra ? extra.minY : Infinity;
  let maxX = extra ? extra.maxX : -Infinity;
  let maxY = extra ? extra.maxY : -Infinity;
  const see = (p: Pt) => {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  };
  for (const shape of shapes) {
    for (const chain of shape) {
      for (const s of chain) {
        if (s.t === "Z") continue;
        if (s.t === "C") {
          see(s.a);
          see(s.b);
        }
        see(s.p);
      }
    }
  }
  // Normalise to a fixed width and snap to integers. The box is measured from
  // the same rounded values, so nothing can fall outside the viewBox.
  const k = UNITS / (maxX - minX);
  const cx = (minX + maxX) / 2;
  const fx = (v: number) => rint((v - cx) * k) + UNITS / 2;
  const fy = (v: number) => rint((v - minY) * k);
  const height = fy(maxY);

  const paths = shapes.map((shape) => {
    const out: string[] = [];
    for (const seg of shape.flat()) {
      if (seg.t === "Z") out.push("Z");
      else if (seg.t === "C")
        out.push(`C${fx(seg.a[0])} ${fy(seg.a[1])} ${fx(seg.b[0])} ${fy(seg.b[1])} ${fx(seg.p[0])} ${fy(seg.p[1])}`);
      else out.push(`${seg.t}${fx(seg.p[0])} ${fy(seg.p[1])}`);
    }
    return out.join(" ");
  });

  return { viewBox: `0 0 ${UNITS} ${height}`, paths };
}
