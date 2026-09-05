export const MONTH_ABBR = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** Months since year 0, UTC. Arithmetic-friendly: feeds straight back into `dateFromMonthIndex`. */
export function monthIndex(ms: number) {
  const d = new Date(ms);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/**
 * Inverse of `monthIndex`. Computes year/month explicitly rather than passing
 * an oversized month to `Date.UTC` with year 0: `Date.UTC` maps a 0-99 year to
 * 1900-1999 (the legacy two-digit-year behaviour `Date` inherits), which
 * silently corrupts any calculation built on "months since year 0".
 */
export function dateFromMonthIndex(mi: number) {
  const year = Math.floor(mi / 12);
  const month = ((mi % 12) + 12) % 12;
  return Date.UTC(year, month, 1);
}

export function parseDay(iso: string) {
  return Date.parse(`${iso}T00:00:00Z`);
}
