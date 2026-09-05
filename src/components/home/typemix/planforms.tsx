import type { Wing } from "@/lib/types";

/**
 * Plan-view (top-down) aircraft silhouettes for the type-mix flight line, keyed
 * by ICAO type designator. Two are traced from Wikimedia Commons SVGs (CC BY-SA
 * 4.0, credited below); the rest are drawn in-house because no usable top-view
 * silhouette could be found under an acceptable licence. See docs/SILHOUETTES.md
 * for the full source list and search notes.
 *
 * Every path is nose-up, tight-cropped to its own viewBox (so the box's own
 * aspect ratio already carries the type's real span/length proportions), single
 * colour, and free of ids/inline styles so `<Planform>` can tint it via
 * `currentColor`.
 */
export interface PlanformDef {
  /** `0 0 W H`, cropped tight to the drawing; H/W already encodes the type's
   *  real length/span ratio (or rotor-diameter/length for rotorcraft). */
  viewBox: string;
  /** One filled shape, or several (fuselage + engine pods, or fuselage + rotor
   *  ring + blades for rotorcraft) so overlapping pieces never fight over a
   *  shared fill-rule. */
  d: string | string[];
  credit: string;
  licence: string;
  source: string;
}

const INHOUSE = "Drawn in-house for vtaircrafts.in";
const NO_SOURCE = "";
const ORIGINAL = "Original artwork";

const FLYINGPETE = "Peter James Lowden (Wikimedia Commons user FlyingPete)";
const CC_BY_SA_4 = "CC BY-SA 4.0";

// Boeing 737-800: traced from Commons, y-flipped to nose-up, simplified to a
// 62-point outline (Ramer-Douglas-Peucker, epsilon 0.25) and re-cropped.
const B738_D =
  "M 27.8 60.5 L 28.9 59.2 L 30.4 53 L 30.9 47.8 L 30.9 38.7 L 33.8 36.3 L 34 40.4 L 36.7 40.4 L 37 37.3 L 36.7 35 L 36.2 34.7 L 53.9 25.4 L 54.8 24.6 L 55.3 23.4 L 55.3 21.5 L 54.2 23.3 L 42.8 26.9 L 42.4 25.4 L 42 27.1 L 37.8 28.1 L 37.4 26.6 L 37 28.3 L 35.2 28.5 L 34.8 26.9 L 34.4 28.5 L 30.9 28.5 L 30.8 14.2 L 29.8 9.3 L 38.9 2.3 L 38.9 0.3 L 28.2 3.5 L 27.9 2.5 L 27.4 3.5 L 16.7 0.3 L 16.7 2.3 L 25.9 9.3 L 24.8 14.2 L 24.7 28.5 L 21.2 28.5 L 20.8 26.9 L 20.4 28.5 L 18.6 28.3 L 18.2 26.6 L 17.8 28.1 L 13.6 27.1 L 13.2 25.4 L 12.8 26.9 L 1.4 23.3 L 0.3 21.5 L 0.3 23.4 L 0.8 24.6 L 1.7 25.4 L 19.4 34.7 L 18.8 35 L 18.6 38.8 L 18.9 40.4 L 21.6 40.4 L 21.8 36.3 L 24.7 38.7 L 24.7 47.8 L 25.2 53 L 26.8 59.2 Z";

// Boeing 787-8: same tracing method, epsilon 0.3, 70-point outline.
const B788_D =
  "M 30.6 58 L 31.8 56.8 L 33.2 52.4 L 33.5 37.9 L 40 33.3 L 39.7 34.1 L 39.1 34 L 38.8 35.2 L 38.9 39.7 L 42.3 39.9 L 42.8 38.1 L 42.7 35.2 L 42.3 33.8 L 41.6 34.1 L 41.2 32.5 L 58.7 20.2 L 60.9 17 L 60.9 16 L 57.7 18.4 L 50.2 21.6 L 49.9 20.5 L 49.5 21.9 L 45.7 23.5 L 45.4 22.4 L 45 23.8 L 41.8 25.2 L 39.8 25.2 L 39.5 24.1 L 39.2 25.2 L 33.5 25.2 L 33.5 16.1 L 32.8 9 L 40 2.2 L 40.7 0.3 L 31.5 3.7 L 30.8 0.8 L 30.4 0.8 L 29.7 3.7 L 20.5 0.3 L 21.2 2.2 L 28.4 9 L 27.7 16.1 L 27.7 25.2 L 22 25.2 L 21.7 24 L 21.4 25.2 L 19.4 25.2 L 16.1 23.8 L 15.7 22.6 L 15.4 23.6 L 11.8 21.9 L 11.4 20.7 L 11.1 21.6 L 3.5 18.4 L 0.3 16 L 0.3 17 L 2.5 20.2 L 20 32.5 L 19.6 34.1 L 18.9 33.8 L 18.6 35.2 L 18.9 39.9 L 22.3 39.7 L 22.4 35.2 L 22.1 34 L 21.5 34.1 L 21.2 33.3 L 27.7 37.9 L 28 52.4 L 29.4 56.8 Z";

// Airbus narrowbody family (A320/A320neo/A321neo): drawn in-house, swept low
// wing with two underwing engine pods, swept tailplane, tapered tail cone.
const A20N_D =
  "M 89.5 0 Q 95.1 4.1 98.9 20.7 L 98.9 75.2 L 179 105.3 L 179 131.6 L 98.9 127.8 L 98.9 165.4 L 116.3 173.9 L 116.3 183.3 L 92.8 184.2 L 89.5 188 L 86.2 184.2 L 62.7 183.3 L 62.7 173.9 L 80.1 165.4 L 80.1 127.8 L 0 131.6 L 0 105.3 L 80.1 75.2 L 80.1 20.7 Q 83.9 4.1 89.5 0 Z M 138.3 84.2 L 148.1 84.2 L 146.4 100.2 L 140 100.2 Z M 30.9 84.2 L 40.7 84.2 L 39 100.2 L 32.6 100.2 Z";
const A21N_D =
  "M 89.5 0 Q 96.2 4.9 100.7 24.5 L 100.7 75.8 L 179 111.5 L 179 142.7 L 100.7 138.3 L 100.7 200.7 L 116.3 210.7 L 116.3 221.9 L 93.4 223 L 89.5 223 L 85.6 223 L 62.7 221.9 L 62.7 210.7 L 78.3 200.7 L 78.3 138.3 L 0 142.7 L 0 111.5 L 78.3 75.8 L 78.3 24.5 Q 82.8 4.9 89.5 0 Z M 137.4 86.5 L 149 86.5 L 147 105.5 L 139.4 105.5 Z M 30 86.5 L 41.6 86.5 L 39.6 105.5 L 32 105.5 Z";
const A320_D =
  "M 85 0 Q 90.6 4.1 94.4 20.7 L 94.4 75.2 L 170 105.3 L 170 131.6 L 94.4 127.8 L 94.4 165.4 L 110.5 173.9 L 110.5 183.3 L 88.3 184.2 L 85 188 L 81.7 184.2 L 59.5 183.3 L 59.5 173.9 L 75.6 165.4 L 75.6 127.8 L 0 131.6 L 0 105.3 L 75.6 75.2 L 75.6 20.7 Q 79.4 4.1 85 0 Z M 131.1 84.2 L 140.9 84.2 L 139.2 100.2 L 132.8 100.2 Z M 29.1 84.2 L 38.9 84.2 L 37.2 100.2 L 30.8 100.2 Z";

// High-wing, T-tail twin turboprops (ATR 72-600, Dash 8 Q400): straight wing,
// nacelles with a thin propeller-disc ring at each.
const AT76_D =
  "M 67.5 0 Q 74.6 4.8 77.7 19 L 77.7 54.4 L 135 60.5 L 135 75.5 L 77.7 81.6 L 77.7 114.2 L 94.5 118.5 L 94.5 126.5 L 70.6 126.5 L 67.5 136 L 64.4 126.5 L 40.5 126.5 L 40.5 118.5 L 57.3 114.2 L 57.3 81.6 L 0 75.5 L 0 60.5 L 57.3 54.4 L 57.3 19 Q 60.4 4.8 67.5 0 Z M 104.5 58.5 L 111.5 58.5 L 111.5 73.4 L 104.5 73.4 Z M 93 66 A 15 15 0 1 0 123 66 A 15 15 0 1 0 93 66 Z M 95.2 66 A 12.8 12.8 0 1 0 120.8 66 A 12.8 12.8 0 1 0 95.2 66 Z M 23.5 58.5 L 30.5 58.5 L 30.5 73.4 L 23.5 73.4 Z M 12 66 A 15 15 0 1 0 42 66 A 15 15 0 1 0 12 66 Z M 14.2 66 A 12.8 12.8 0 1 0 39.8 66 A 12.8 12.8 0 1 0 14.2 66 Z";
const DH8D_D =
  "M 71 0 Q 78.1 4.5 81.2 18 L 81.2 68.9 L 142 76.3 L 142 94.3 L 81.2 101.7 L 81.2 142.7 L 99.4 147.8 L 99.4 157.4 L 74.1 157.4 L 71 164 L 67.9 157.4 L 42.6 157.4 L 42.6 147.8 L 60.8 142.7 L 60.8 101.7 L 0 94.3 L 0 76.3 L 60.8 68.9 L 60.8 18 Q 63.9 4.5 71 0 Z M 106.6 73.8 L 113.5 73.8 L 113.5 91.8 L 106.6 91.8 Z M 92 82.8 A 18 18 0 1 0 128.1 82.8 A 18 18 0 1 0 92 82.8 Z M 94.2 82.8 A 15.8 15.8 0 1 0 125.9 82.8 A 15.8 15.8 0 1 0 94.2 82.8 Z M 28.5 73.8 L 35.4 73.8 L 35.4 91.8 L 28.5 91.8 Z M 13.9 82.8 A 18 18 0 1 0 50 82.8 A 18 18 0 1 0 13.9 82.8 Z M 16.1 82.8 A 15.8 15.8 0 1 0 47.8 82.8 A 15.8 15.8 0 1 0 16.1 82.8 Z";

// King Airs (350 and 200): same twin-turboprop T-tail family, short fuselage
// relative to a wide straight wing.
const B350_D =
  "M 70.5 0 Q 76.5 4.6 79 18.2 L 79 45.6 L 141 51.9 L 141 64.4 L 79 70.7 L 79 100.3 L 94.5 103.9 L 94.5 110.6 L 73.1 110.6 L 70.5 114 L 67.9 110.6 L 46.5 110.6 L 46.5 103.9 L 62 100.3 L 62 70.7 L 0 64.4 L 0 51.9 L 62 45.6 L 62 18.2 Q 64.5 4.6 70.5 0 Z M 97.2 49.4 L 103 49.4 L 103 63.2 L 97.2 63.2 Z M 88.7 56.3 A 11.4 11.4 0 1 0 111.5 56.3 A 11.4 11.4 0 1 0 88.7 56.3 Z M 90.9 56.3 A 9.2 9.2 0 1 0 109.3 56.3 A 9.2 9.2 0 1 0 90.9 56.3 Z M 38 49.4 L 43.8 49.4 L 43.8 63.2 L 38 63.2 Z M 29.5 56.3 A 11.4 11.4 0 1 0 52.3 56.3 A 11.4 11.4 0 1 0 29.5 56.3 Z M 31.7 56.3 A 9.2 9.2 0 1 0 50.1 56.3 A 9.2 9.2 0 1 0 31.7 56.3 Z";
const BE20_D =
  "M 66.5 0 Q 72.3 4.3 74.8 17.1 L 74.8 42.8 L 133 48.7 L 133 60.5 L 74.8 66.3 L 74.8 94.2 L 89.1 97.5 L 89.1 103.8 L 69 103.8 L 66.5 107 L 64 103.8 L 43.9 103.8 L 43.9 97.5 L 58.2 94.2 L 58.2 66.3 L 0 60.5 L 0 48.7 L 58.2 42.8 L 58.2 17.1 Q 60.7 4.3 66.5 0 Z M 91.6 46.3 L 97.3 46.3 L 97.3 59.3 L 91.6 59.3 Z M 83.7 52.8 A 10.7 10.7 0 1 0 105.1 52.8 A 10.7 10.7 0 1 0 83.7 52.8 Z M 85.9 52.8 A 8.5 8.5 0 1 0 102.9 52.8 A 8.5 8.5 0 1 0 85.9 52.8 Z M 35.7 46.3 L 41.4 46.3 L 41.4 59.3 L 35.7 59.3 Z M 27.9 52.8 A 10.7 10.7 0 1 0 49.3 52.8 A 10.7 10.7 0 1 0 27.9 52.8 Z M 30.1 52.8 A 8.5 8.5 0 1 0 47.1 52.8 A 8.5 8.5 0 1 0 30.1 52.8 Z";

// Eurocopter/Airbus Helicopters Dauphin (AS365): fuselage + shrouded fenestron
// tail fan + 4-blade main rotor disc. Array form keeps the rotor ring's hole
// from fighting the fuselage fill under one shared fill-rule.
const AS65_D = [
  "M 50 0 Q 70.5 1.6 67.8 10.3 L 67.8 21.5 L 53.2 39.1 L 53.2 101.2 L 46.8 101.2 L 46.8 39.1 L 32.2 21.5 L 32.2 10.3 Q 29.5 1.6 50 0 Z",
  "M 41.4 101.2 A 8.6 8.6 0 1 0 58.6 101.2 A 8.6 8.6 0 1 0 41.4 101.2 Z M 45.3 101.2 A 4.7 4.7 0 1 0 54.7 101.2 A 4.7 4.7 0 1 0 45.3 101.2 Z",
  "M 2 48.3 A 48 48 0 1 0 98 48.3 A 48 48 0 1 0 2 48.3 Z M 4.4 48.3 A 45.6 45.6 0 1 0 95.6 48.3 A 45.6 45.6 0 1 0 4.4 48.3 Z",
  "M 48.9 47.8 L 32 88.6 L 34.2 89.5 L 51.1 48.8 Z",
  "M 50.5 47.2 L 9.7 30.3 L 8.8 32.5 L 49.5 49.4 Z",
  "M 51.1 48.8 L 68 8 L 65.8 7.1 L 48.9 47.8 Z",
  "M 49.5 49.4 L 90.3 66.3 L 91.2 64.1 L 50.5 47.2 Z",
];

// Leonardo/AgustaWestland AW109: fuselage + exposed tail rotor disc + 4-blade
// main rotor disc.
const A109_D = [
  "M 47 0 Q 66.3 1.5 63.7 9.7 L 63.7 21.4 L 50 38.9 L 50 95 L 44 95 L 44 38.9 L 30.3 21.4 L 30.3 9.7 Q 27.7 1.5 47 0 Z",
  "M 31.7 95 A 5 5 0 1 0 41.7 95 A 5 5 0 1 0 31.7 95 Z",
  "M 36.7 86.9 L 35.7 103.1 L 37.7 103.1 Z",
  "M 3 45.4 A 44 44 0 1 0 91 45.4 A 44 44 0 1 0 3 45.4 Z M 5.4 45.4 A 41.6 41.6 0 1 0 88.6 45.4 A 41.6 41.6 0 1 0 5.4 45.4 Z",
  "M 46 44.9 L 30.6 82 L 32.7 82.8 L 48 45.8 Z",
  "M 47.4 44.3 L 10.4 29 L 9.5 31 L 46.6 46.4 Z",
  "M 48 45.8 L 63.4 8.7 L 61.3 7.9 L 46 44.9 Z",
  "M 46.6 46.4 L 83.6 61.7 L 84.5 59.7 L 47.4 44.3 Z",
];

// Generic balloon fallback: envelope only, seen from directly above.
const BALLOON_D =
  "M 10 46 A 40 40 0 1 0 90 46 A 40 40 0 1 0 10 46 Z M 42 78 L 58 78 L 58 92 L 42 92 Z";

export const PLANFORMS: Record<string, PlanformDef> = {
  A20N: { viewBox: "0 0 179 188", d: A20N_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  A21N: { viewBox: "0 0 179 223", d: A21N_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  A320: { viewBox: "0 0 170 188", d: A320_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  AT76: { viewBox: "0 0 135 136", d: AT76_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  DH8D: { viewBox: "0 0 142 164", d: DH8D_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  B350: { viewBox: "0 0 141 114", d: B350_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  BE20: {
    viewBox: "0 0 133 107",
    d: BE20_D,
    credit: `${INHOUSE}, scaled from the King Air 350 planform (same T-tail twin-turboprop family)`,
    licence: ORIGINAL,
    source: NO_SOURCE,
  },
  AS65: { viewBox: "0 0 100 115", d: AS65_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  A109: { viewBox: "0 0 94 108", d: A109_D, credit: INHOUSE, licence: ORIGINAL, source: NO_SOURCE },
  B738: {
    viewBox: "0 0 55.6 60.8",
    d: B738_D,
    credit: FLYINGPETE,
    licence: CC_BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Boeing_737-800_silhouette.svg",
  },
  B788: {
    viewBox: "0 0 61.2 58.3",
    d: B788_D,
    credit: FLYINGPETE,
    licence: CC_BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Boeing_787-8_silhouette.svg",
  },
  B38M: {
    viewBox: "0 0 55.6 60.8",
    d: B738_D,
    credit: `${FLYINGPETE} — reuses the 737-800 planform (no 737 MAX silhouette on Commons; near-identical airframe)`,
    licence: CC_BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Boeing_737-800_silhouette.svg",
  },
  // Generic fallbacks, used when a type has no dedicated entry above (and for
  // the wing-category key in the legend strip).
  FW: { viewBox: "0 0 170 188", d: A320_D, credit: `${INHOUSE} (generic fixed-wing)`, licence: ORIGINAL, source: NO_SOURCE },
  RW: { viewBox: "0 0 94 108", d: A109_D, credit: `${INHOUSE} (generic rotary)`, licence: ORIGINAL, source: NO_SOURCE },
  B: { viewBox: "0 0 100 100", d: BALLOON_D, credit: `${INHOUSE} (generic balloon)`, licence: ORIGINAL, source: NO_SOURCE },
};

/** The type's own plan-view aspect ratio (drawing height / width), falling
 *  back to its wing category's generic shape when the ICAO code isn't drawn. */
export function planformAspect(icao: string | null, wing: Wing): number {
  const def = (icao && PLANFORMS[icao]) || PLANFORMS[wing] || PLANFORMS.FW;
  const [, , w, h] = def.viewBox.split(" ").map(Number);
  return h / w;
}

/**
 * A plan-view aircraft silhouette, filled with `currentColor` so its tone
 * (ink / mint / signal) comes from the wrapping element's text colour. Falls
 * back to the wing category's generic shape when the ICAO code isn't one of
 * the drawn types.
 */
export function Planform({
  icao,
  wing,
  className,
  strokeWidth = 1,
}: {
  icao: string | null;
  wing: Wing;
  className?: string;
  strokeWidth?: number;
}) {
  const def = (icao && PLANFORMS[icao]) || PLANFORMS[wing] || PLANFORMS.FW;
  const paths = Array.isArray(def.d) ? def.d : [def.d];
  return (
    <svg viewBox={def.viewBox} className={className} aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="currentColor" fillRule="evenodd" stroke="currentColor" strokeWidth={strokeWidth * 0.4} strokeLinejoin="round" />
      ))}
    </svg>
  );
}
