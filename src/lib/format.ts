export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function fmtInt(n: number) {
  return n.toLocaleString("en-IN");
}

/** Commons thumb URLs are path based: swap the requested width. */
export function thumb(src: string, width: number) {
  return src.replace(/\/(\d+)px-/, `/${width}px-`);
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.round((Date.parse(iso) - Date.now()) / 86400000);
}
