export const REG_FULL = /^VT-[A-Z]{3}$/;
export const REG_NOHYPHEN = /^VT[A-Z]{3}$/;
export const REG_PREFIX_ONLY = /^VT-?$/;
export const REG_SUFFIX_ONLY = /^[A-Z]{3}$/;

/** Normalise a registration token like "VT-ANA", "VTANA", "vt-ana" to "VT-ANA". */
export function normalizeReg(s: string): string | null {
  const t = s.toUpperCase().replace(/\s+/g, "");
  if (REG_FULL.test(t)) return t;
  if (REG_NOHYPHEN.test(t)) return `VT-${t.slice(2)}`;
  return null;
}

/** "30.06.2028" -> "2028-06-30" */
export function parseDmy(s: string): string | null {
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Collapse "ATR72- 600" -> "ATR72-600", "B777-200 LR" stays. */
export function cleanModel(s: string): string {
  return cleanSpaces(s)
    .replace(/-\s+(?=\w)/g, "-")
    .replace(/\s+-(?=\w)/g, "-")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

export function parseSeats(raw: string): number | null {
  const m = raw.match(/\d+/);
  return m ? Number(m[0]) : null;
}
