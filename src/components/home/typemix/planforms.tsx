import type { Wing } from "@/lib/types";
import { bladeDisc, bladePhase, buildPaths, capsule, circle, symmetric, wing, wingAtRear } from "./geometry";
import type { Bounds, Chain, Shape } from "./geometry";

/**
 * Plan-view (top-down) aircraft pictograms for the type-mix flight line.
 *
 * Every type on the sheet is drawn by one generator from a table of published
 * dimensions, so the whole line shares a single format and a single look: flat
 * shapes filled with `currentColor`, no strokes, no outlines, built from
 * straight segments and cubic curves, symmetric about the centreline, nose up.
 * Nothing here is traced from anyone else's artwork. See docs/SILHOUETTES.md.
 *
 * Specs are in metres. `buildPlanform` measures the finished geometry and
 * returns a viewBox cropped to it, so a type's viewBox aspect *is* its real
 * length/span (rotor-diameter for rotorcraft) proportion, which is what the
 * flight-line layout uses to size it.
 */

/** A fixed-wing aeroplane: fuselage, wing, engines, tailplane, fin. */
export interface FixedWingSpec {
  kind: "fw";
  /** Overall fuselage length, nose to tail cone. */
  length: number;
  /** Maximum fuselage width. */
  width: number;
  /** Share of the length taken by the nose taper. */
  noseTaper: number;
  /** Share of the length taken by the tail cone. */
  tailTaper: number;
  span: number;
  rootChord: number;
  tipChord: number;
  /** Leading-edge sweep, degrees. */
  sweep: number;
  /** Wing leading-edge root, as a share of fuselage length from the nose. */
  wingX: number;
  engines: "underwing" | "rearFuselage" | "wingProp" | "none";
  engineCount: number;
  nacelleLength: number;
  nacelleWidth: number;
  /** Propeller disc radius, for `wingProp`. */
  propRadius?: number;
  propBlades?: number;
  /** Engine station as a share of semi-span. */
  enginePos?: number;
  /** Draws a small forward-raked triangle at each tip (split-tip winglets). */
  winglets?: boolean;
  htSpan: number;
  htChord: number;
  htSweep: number;
  /** Horizontal tail carried on top of the fin: a wider bar at the very rear. */
  tTail?: boolean;
  finLength: number;
  finWidth: number;
}

/** A helicopter: teardrop cabin into a tail boom, main rotor, anti-torque. */
export interface RotorcraftSpec {
  kind: "rw";
  /** Cabin length, nose to the boom junction. */
  length: number;
  width: number;
  boomLength: number;
  boomWidth: number;
  rotorRadius: number;
  blades: number;
  bladeRoot: number;
  bladeTip: number;
  /** Rotor hub, as a share of cabin length from the nose. */
  hubX: number;
  tailRotorRadius: number;
  /** Shrouded tail fan: a ring cut into a fin instead of an exposed disc. */
  fenestron?: boolean;
  gear: "skids" | "wheels";
  /** Horizontal stabiliser span on the boom. */
  stabSpan: number;
}

export interface BalloonSpec {
  kind: "b";
  envelopeRadius: number;
  basketWidth: number;
  basketLength: number;
}

export type PlanformSpec = FixedWingSpec | RotorcraftSpec | BalloonSpec;

const RAD = Math.PI / 180;

function fixedWing(s: FixedWingSpec): Shape[] {
  const hw = s.width / 2;
  const noseEnd = s.length * s.noseTaper;
  const tailStart = s.length * (1 - s.tailTaper);
  const tailW = s.width * 0.16;
  const shapes: Shape[] = [];

  // Fuselage: ogive nose, parallel barrel, tapered tail cone.
  const fuse: Chain = [
    { t: "M", p: [0, 0] },
    { t: "C", a: [hw * 0.58, 0], b: [hw, noseEnd * 0.42], p: [hw, noseEnd] },
    { t: "L", p: [hw, tailStart] },
    {
      t: "C",
      a: [hw, tailStart + (s.length - tailStart) * 0.5],
      b: [tailW * 0.95, s.length - (s.length - tailStart) * 0.1],
      p: [tailW / 2, s.length],
    },
  ];
  shapes.push([symmetric(fuse)]);

  const halfSpan = s.span / 2;
  const leRoot = s.length * s.wingX;
  shapes.push([wing(leRoot, s.rootChord, halfSpan, s.tipChord, s.sweep)]);

  if (s.winglets) {
    const leTip = leRoot + Math.tan(s.sweep * RAD) * halfSpan;
    const t = s.tipChord;
    const tri = (sign: number): Chain => [
      { t: "M", p: [sign * halfSpan, leTip - t * 0.75] },
      { t: "L", p: [sign * halfSpan, leTip + t * 1.05] },
      { t: "L", p: [sign * (halfSpan - t * 0.5), leTip + t * 0.15] },
      { t: "Z" },
    ];
    shapes.push([tri(1), tri(-1)]);
  }

  // Engines. Stations are mirrored, so `engineCount` 2 gives one pair.
  const pairs = Math.max(1, Math.round(s.engineCount / 2));
  const pos = s.enginePos ?? 0.33;
  const stations: number[] = [];
  for (let i = 0; i < pairs; i++) stations.push(halfSpan * (pos + i * 0.27));

  if (s.engines === "underwing" || s.engines === "wingProp") {
    const nacelles: Chain[] = [];
    const discs: Chain[] = [];
    const fwd = s.engines === "wingProp" ? 0.62 : 0.78;
    for (const ex of stations) {
      const le = leRoot + Math.tan(s.sweep * RAD) * ex;
      const front = le - s.nacelleLength * fwd;
      for (const sign of [1, -1]) {
        nacelles.push(capsule(sign * ex, front, front + s.nacelleLength, s.nacelleWidth));
        if (s.engines === "wingProp" && s.propRadius) {
          const r = s.propRadius;
          const n = s.propBlades ?? 4;
          const cy = front + s.nacelleWidth * 0.12;
          // Blades are drawn fat: at flight-line size a scale-chord blade is
          // thinner than a pixel, so the disc has to carry the reading.
          discs.push(...bladeDisc(sign * ex, cy, n, 0, r, r * 0.46, r * 0.3, bladePhase(n)));
        }
      }
    }
    shapes.push(nacelles);
    if (discs.length) shapes.push(discs);
  } else if (s.engines === "rearFuselage") {
    const y0 = tailStart - s.nacelleLength * 0.2;
    const ex = hw + s.nacelleWidth * 0.55;
    shapes.push([capsule(ex, y0, y0 + s.nacelleLength, s.nacelleWidth), capsule(-ex, y0, y0 + s.nacelleLength, s.nacelleWidth)]);
  }

  // Fin: a short thick line down the centreline at the rear.
  shapes.push([capsule(0, s.length - s.finLength, s.length - s.length * 0.01, s.finWidth)]);

  // Tailplane: on top of the fin at the very rear for a T-tail, a little
  // further forward for a conventional tail.
  const rear = s.tTail ? s.length - s.length * 0.005 : s.length - s.length * 0.05;
  const htTip = s.tTail ? s.htChord * 0.62 : s.htChord * 0.5;
  shapes.push([wingAtRear(rear, s.htChord, s.htSpan / 2, htTip, s.htSweep)]);

  return shapes;
}

function rotorcraft(s: RotorcraftSpec): { shapes: Shape[]; bounds: Bounds } {
  const hw = s.width / 2;
  const L = s.length;
  const bw = s.boomWidth;
  const boomEnd = L + s.boomLength;
  const shapes: Shape[] = [];

  // Teardrop cabin narrowing into the tail boom.
  const body: Chain = [
    { t: "M", p: [0, 0] },
    { t: "C", a: [hw * 0.72, L * 0.02], b: [hw, L * 0.15], p: [hw, L * 0.42] },
    { t: "C", a: [hw, L * 0.62], b: [bw * 0.85, L * 0.88], p: [bw / 2, L] },
    { t: "L", p: [bw * 0.44, boomEnd] },
  ];
  shapes.push([symmetric(body)]);

  // Gear hint: two short parallel lines outboard of the cabin.
  const gearX = hw * 1.42;
  const y0 = s.gear === "skids" ? L * 0.3 : L * 0.48;
  const y1 = s.gear === "skids" ? L * 0.88 : L * 0.7;
  shapes.push([capsule(gearX, y0, y1, s.width * 0.13), capsule(-gearX, y0, y1, s.width * 0.13)]);

  // Boom stabiliser.
  shapes.push([wing(boomEnd - s.stabSpan * 0.34, s.stabSpan * 0.28, s.stabSpan / 2, s.stabSpan * 0.22, 0)]);

  // Anti-torque: a shrouded fan (ring cut into a fin) or an exposed disc.
  const tr = s.tailRotorRadius;
  if (s.fenestron) {
    const cy = boomEnd + tr * 0.72;
    shapes.push([capsule(0, boomEnd - tr * 0.9, boomEnd + tr * 1.95, tr * 2.05), circle(0, cy, tr * 0.58)]);
  } else {
    // Short fin on the centreline, tail-rotor disc offset to one side of it.
    shapes.push([capsule(0, boomEnd - tr * 0.7, boomEnd + tr * 0.75, bw * 1.15)]);
    shapes.push([circle(bw * 0.5 + tr * 0.86, boomEnd, tr * 0.86)]);
  }

  // Main rotor: solid blades from the hub, one blade forward of the nose.
  const hubY = L * s.hubX;
  const r = s.rotorRadius;
  shapes.push(bladeDisc(0, hubY, s.blades, r * 0.05, r, s.bladeRoot, s.bladeTip, bladePhase(s.blades)));
  shapes.push([circle(0, hubY, s.bladeRoot * 1.15)]);

  // The rotor disc, not the blade tips, sets the drawing's width: that is the
  // rotorcraft's "span", so it is scaled against fixed-wing spans honestly.
  return { shapes, bounds: { minX: -r, maxX: r, minY: hubY - r, maxY: hubY + r } };
}

function balloon(s: BalloonSpec): Shape[] {
  const r = s.envelopeRadius;
  return [
    [circle(0, 0, r)],
    [capsule(0, r * 1.15, r * 1.15 + s.basketLength, s.basketWidth)],
  ];
}

/** Turns a spec into a tight viewBox plus one path string per part. */
export function buildPlanform(spec: PlanformSpec): { viewBox: string; paths: string[] } {
  if (spec.kind === "rw") {
    const { shapes, bounds } = rotorcraft(spec);
    return buildPaths(shapes, bounds);
  }
  return buildPaths(spec.kind === "fw" ? fixedWing(spec) : balloon(spec));
}

/* ------------------------------------------------------------------ specs */

/** Airbus A320 family: one wing, three fuselage lengths and nacelle sizes. */
function narrowbodyAirbus(length: number, span: number, nacelleWidth: number, nacelleLength: number): FixedWingSpec {
  return {
    kind: "fw",
    length,
    width: 3.95,
    noseTaper: 0.14,
    tailTaper: 0.26,
    span,
    rootChord: 6.1,
    tipChord: 1.7,
    sweep: 27,
    wingX: 0.41,
    engines: "underwing",
    engineCount: 2,
    nacelleLength,
    nacelleWidth,
    enginePos: 0.33,
    htSpan: 12.45,
    htChord: 3.6,
    htSweep: 29,
    finLength: length * 0.2,
    finWidth: 1.5,
  };
}

/** Boeing 737: 737-800 and 737-8 differ mainly in nacelle size and tips. */
function boeing737(length: number, span: number, nacelleWidth: number, winglets: boolean): FixedWingSpec {
  return {
    kind: "fw",
    length,
    width: 3.76,
    noseTaper: 0.13,
    tailTaper: 0.25,
    span,
    rootChord: 6.4,
    tipChord: 1.6,
    sweep: 26,
    wingX: 0.4,
    engines: "underwing",
    engineCount: 2,
    nacelleLength: 4.7,
    nacelleWidth,
    enginePos: 0.31,
    winglets,
    htSpan: 14.35,
    htChord: 3.7,
    htSweep: 30,
    finLength: length * 0.19,
    finWidth: 1.5,
  };
}

/** Twin turboprop with a T-tail: ATR 72, Dash 8 Q400, King Air. */
function turboprop(o: {
  length: number;
  width: number;
  span: number;
  rootChord: number;
  tipChord: number;
  wingX: number;
  propRadius: number;
  nacelleLength: number;
  nacelleWidth: number;
  enginePos: number;
  htSpan: number;
  htChord: number;
  propBlades: number;
}): FixedWingSpec {
  return {
    kind: "fw",
    length: o.length,
    width: o.width,
    noseTaper: 0.14,
    tailTaper: 0.24,
    span: o.span,
    rootChord: o.rootChord,
    tipChord: o.tipChord,
    sweep: 2.5,
    wingX: o.wingX,
    engines: "wingProp",
    engineCount: 2,
    nacelleLength: o.nacelleLength,
    nacelleWidth: o.nacelleWidth,
    propRadius: o.propRadius,
    propBlades: o.propBlades,
    enginePos: o.enginePos,
    htSpan: o.htSpan,
    htChord: o.htChord,
    htSweep: 12,
    tTail: true,
    finLength: o.length * 0.22,
    finWidth: o.width * 0.5,
  };
}

const SPECS: Record<string, PlanformSpec> = {
  // Airbus narrowbodies. A320neo 35.80 x 37.57, A321neo 35.80 x 44.51,
  // A320ceo 34.10 x 37.57 with the smaller CFM56 nacelle.
  A20N: narrowbodyAirbus(37.57, 35.8, 2.6, 5.2),
  A21N: narrowbodyAirbus(44.51, 35.8, 2.6, 5.2),
  A320: narrowbodyAirbus(37.57, 34.1, 2.0, 4.5),

  // Boeing 737-800 35.79 x 39.47 (flattened CFM56 pods, well forward);
  // 737-8 35.92 x 39.52 (larger LEAP-1B pods, split-tip winglets).
  B738: boeing737(39.47, 35.79, 2.1, false),
  B38M: boeing737(39.52, 35.92, 2.5, true),

  // Boeing 787-8, 60.12 x 56.72, raked 32 degree wing, big GEnx nacelles.
  B788: {
    kind: "fw",
    length: 56.72,
    width: 5.77,
    noseTaper: 0.13,
    tailTaper: 0.27,
    span: 60.12,
    rootChord: 9.6,
    tipChord: 2.6,
    sweep: 32,
    wingX: 0.4,
    engines: "underwing",
    engineCount: 2,
    nacelleLength: 6.6,
    nacelleWidth: 4.3,
    enginePos: 0.31,
    htSpan: 19.6,
    htChord: 5.4,
    htSweep: 34,
    finLength: 11,
    finWidth: 2.1,
  },

  // ATR 72-600, 27.05 x 27.17, high straight wing, T-tail, six-blade props.
  AT76: turboprop({
    length: 27.17,
    width: 2.87,
    span: 27.05,
    rootChord: 2.6,
    tipChord: 1.6,
    wingX: 0.33,
    propRadius: 1.97,
    propBlades: 4,
    nacelleLength: 6.2,
    nacelleWidth: 1.6,
    enginePos: 0.31,
    htSpan: 7.31,
    htChord: 2.2,
  }),

  // Dash 8 Q400, 28.42 x 32.84, long slim fuselage, T-tail, six-blade props.
  DH8D: turboprop({
    length: 32.84,
    width: 2.69,
    span: 28.42,
    rootChord: 2.9,
    tipChord: 1.7,
    wingX: 0.32,
    propRadius: 2.06,
    propBlades: 4,
    nacelleLength: 7.4,
    nacelleWidth: 1.7,
    enginePos: 0.3,
    htSpan: 9.0,
    htChord: 2.5,
  }),

  // King Air 350 (17.65 x 14.22) and King Air 200 (16.61 x 13.34): low
  // straight wing, T-tail, four-blade props.
  B350: turboprop({
    length: 14.22,
    width: 1.68,
    span: 17.65,
    rootChord: 2.2,
    tipChord: 1.1,
    wingX: 0.34,
    propRadius: 1.4,
    propBlades: 4,
    nacelleLength: 4.4,
    nacelleWidth: 1.05,
    enginePos: 0.33,
    htSpan: 5.6,
    htChord: 1.5,
  }),
  BE20: turboprop({
    length: 13.34,
    width: 1.65,
    span: 16.61,
    rootChord: 2.15,
    tipChord: 1.05,
    wingX: 0.34,
    propRadius: 1.25,
    propBlades: 4,
    nacelleLength: 4.1,
    nacelleWidth: 1.0,
    enginePos: 0.33,
    htSpan: 5.2,
    htChord: 1.45,
  }),

  // Airbus Dauphin AS365: 4-blade rotor, radius 5.9, fuselage 12.0, fenestron.
  AS65: {
    kind: "rw",
    length: 8.1,
    width: 2.66,
    boomLength: 3.1,
    boomWidth: 0.95,
    rotorRadius: 5.9,
    blades: 4,
    bladeRoot: 0.46,
    bladeTip: 0.28,
    hubX: 0.62,
    tailRotorRadius: 0.55,
    fenestron: true,
    gear: "wheels",
    stabSpan: 2.6,
  },

  // Leonardo AW109: 4-blade rotor, radius 5.5, fuselage 11.45, tail rotor.
  A109: {
    kind: "rw",
    length: 7.7,
    width: 2.36,
    boomLength: 3.1,
    boomWidth: 0.84,
    rotorRadius: 5.5,
    blades: 4,
    bladeRoot: 0.43,
    bladeTip: 0.26,
    hubX: 0.6,
    tailRotorRadius: 1.05,
    gear: "wheels",
    stabSpan: 2.4,
  },

  // Airbus H125 (AS350): 3-blade rotor, radius 5.35, fuselage 10.93, skids.
  AS50: {
    kind: "rw",
    length: 6.9,
    width: 2.32,
    boomLength: 3.2,
    boomWidth: 0.8,
    rotorRadius: 5.35,
    blades: 3,
    bladeRoot: 0.42,
    bladeTip: 0.26,
    hubX: 0.58,
    tailRotorRadius: 0.93,
    gear: "skids",
    stabSpan: 2.2,
  },

  // Bell 412: 4-blade rotor, radius 7.01, fuselage 12.92, skids.
  B412: {
    kind: "rw",
    length: 8.4,
    width: 3.1,
    boomLength: 3.9,
    boomWidth: 1.05,
    rotorRadius: 7.01,
    blades: 4,
    bladeRoot: 0.55,
    bladeTip: 0.33,
    hubX: 0.58,
    tailRotorRadius: 1.3,
    gear: "skids",
    stabSpan: 2.9,
  },

  // Generic fallbacks, also used for the wing-category key in the legend.
  FW: narrowbodyAirbus(37.57, 34.1, 2.2, 4.7),
  RW: {
    kind: "rw",
    length: 7.6,
    width: 2.4,
    boomLength: 3.1,
    boomWidth: 0.86,
    rotorRadius: 5.6,
    blades: 4,
    bladeRoot: 0.9,
    bladeTip: 0.57,
    hubX: 0.6,
    tailRotorRadius: 1.0,
    gear: "skids",
    stabSpan: 2.4,
  },
  B: { kind: "b", envelopeRadius: 8.5, basketWidth: 3.4, basketLength: 3.4 },
};

export interface PlanformDef {
  /** `0 0 W H`, cropped to the drawing, so H/W is the type's real
   *  length/span (rotor-diameter for rotorcraft) proportion. */
  viewBox: string;
  /** One string per part (fuselage, wing, nacelles, tail, blades), kept apart
   *  so overlapping pieces never fight over a shared fill rule. */
  paths: string[];
}

/** Every drawn type, generated once at module load. */
export const PLANFORMS: Record<string, PlanformDef> = Object.fromEntries(
  Object.entries(SPECS).map(([k, spec]) => [k, buildPlanform(spec)]),
);

function defFor(icao: string | null, wing: Wing): PlanformDef {
  return (icao && PLANFORMS[icao]) || PLANFORMS[wing] || PLANFORMS.FW;
}

/** The type's own plan-view aspect ratio (drawing height / width), falling
 *  back to its wing category's generic shape when the ICAO code isn't drawn. */
export function planformAspect(icao: string | null, wing: Wing): number {
  const [, , w, h] = defFor(icao, wing).viewBox.split(" ").map(Number);
  return h / w;
}

/**
 * A plan-view aircraft pictogram, filled with `currentColor` so its tone
 * (ink / mint / signal) comes from the wrapping element's text colour. Falls
 * back to the wing category's generic shape when the ICAO code isn't one of
 * the drawn types.
 */
export function Planform({ icao, wing, className }: { icao: string | null; wing: Wing; className?: string }) {
  const def = defFor(icao, wing);
  return (
    <svg viewBox={def.viewBox} className={className} fill="currentColor" fillRule="evenodd" aria-hidden>
      {def.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
