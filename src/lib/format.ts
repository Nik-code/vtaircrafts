export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function fmtInt(n: number) {
  return n.toLocaleString("en-IN");
}

/**
 * Wikimedia only renders thumbnails at fixed steps (verified Sep 2026: 120, 250, 330,
 * 500, 960, 1280, 1920); any other width returns HTTP 400. Snap up to the nearest
 * allowed step. Unscaled originals (no "/NNNpx-" segment) are returned unchanged.
 */
export const THUMB_STEPS = [120, 250, 330, 500, 960, 1280, 1920] as const;

export function thumbWidth(width: number): number {
  return THUMB_STEPS.find((s) => s >= width) ?? THUMB_STEPS[THUMB_STEPS.length - 1];
}

export function thumb(src: string, width: number) {
  if (!/\/(\d+)px-/.test(src)) return src;
  return src.replace(/\/(\d+)px-/, `/${thumbWidth(width)}px-`).replace(/\?utm_[^#]*$/, "");
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.round((Date.parse(iso) - Date.now()) / 86400000);
}
