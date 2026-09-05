import type { Wing } from "@/lib/types";

/**
 * Tiny plan-view glyphs for the apron chart. Each path is authored inside a
 * 0..10 box with the nose pointing up, so a whole fleet can be stamped out with
 * `<use href="#f" x="…">` inside a row group. Paths carry no fill of their own:
 * the layer they are used from supplies it.
 */
export const GLYPH_ID: Record<Wing, string> = { FW: "f", RW: "r", B: "b" };

/** Airliner plan view: spindle fuselage, swept wings, tailplane. */
const FIXED_WING =
  "M5 .5C5.55 1.3 5.8 2.5 5.85 3.85L9.6 6.2 9.6 7 5.85 5.85 5.85 8l1 .95V9.5L5 8.95 3.15 9.5V8.95l1-.95V5.85L.4 7V6.2l3.75-2.35C4.2 2.5 4.45 1.3 5 .5Z";

/** Helicopter plan view: cabin, tail boom with stabiliser, two rotor blades. */
const ROTARY =
  "M5 1.6c1.3 0 2.05 1.1 2.05 2.5 0 1.2-.55 2.1-1.4 2.45L5.4 9h1.1v.6h-3V9h1.1l-.25-2.45C3.5 6.2 2.95 5.3 2.95 4.1c0-1.4.75-2.5 2.05-2.5Z" +
  "M.46 3.06 9.46 4.66 9.54 5.14.54 3.54Z" +
  "M1.52 6.41 8.72 2.21 8.48 1.79 1.28 5.99Z";

/** Balloon from above and its basket. */
const BALLOON = "M5 1.1a3.5 3.5 0 1 1-.01 0ZM4.1 8.3h1.8v1.4H4.1Z";

export const GLYPH_PATHS: Record<Wing, string> = { FW: FIXED_WING, RW: ROTARY, B: BALLOON };

/** Every glyph, defined once, as SVG `<defs>` markup. */
export function glyphDefs() {
  return `<defs>${(Object.keys(GLYPH_PATHS) as Wing[])
    .map((w) => `<path id='${GLYPH_ID[w]}' d='${GLYPH_PATHS[w]}'/>`)
    .join("")}</defs>`;
}
