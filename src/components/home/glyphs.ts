import type { Wing } from "@/lib/types";

/**
 * The three aircraft-kind marks for the apron chart, authored once as
 * `<defs>` shapes and stamped out with `<use>`. All three read as a small
 * rounded square from a distance so the field stays a calm dot matrix, not a
 * field of tiny silhouettes: up close a fixed-wing aircraft is a solid
 * square, a rotary aircraft carries a 45° hairline cross, and a balloon is a
 * circle. Shapes carry no fill of their own: the `<g fill="…">` layer that
 * uses them supplies the scheduled / non-scheduled colour.
 */
export const MARK_ID: Record<Wing, string> = { FW: "mf", RW: "mr", B: "mb" };

/** Hairline colour cut into the rotary mark; reused by the legend swatch. */
export const MARK_LINE = "#0B2E5A";

/** Every mark, defined once at `size` (viewBox units), as SVG `<defs>` markup. */
export function markDefs(size: number) {
  const r = round(size / 2);
  return (
    `<defs>` +
    `<rect id='${MARK_ID.FW}' width='${size}' height='${size}' rx='1'/>` +
    `<g id='${MARK_ID.RW}'>` +
    `<rect width='${size}' height='${size}' rx='1'/>` +
    `<line x1='0' y1='0' x2='${size}' y2='${size}' stroke='${MARK_LINE}' stroke-width='.6'/>` +
    `<line x1='0' y1='${size}' x2='${size}' y2='0' stroke='${MARK_LINE}' stroke-width='.6'/>` +
    `</g>` +
    `<circle id='${MARK_ID.B}' cx='${r}' cy='${r}' r='${r}'/>` +
    `</defs>`
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
