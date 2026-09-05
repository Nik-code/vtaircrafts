export const REG_FULL = /^VT-[A-Z]{3}$/;
export const REG_NOHYPHEN = /^VT[A-Z]{3}$/;
export const REG_PREFIX_ONLY = /^VT-?$/;
export const REG_SUFFIX_ONLY = /^[A-Z]{3}$/;

/**
 * Strip the list punctuation the pre-2018 DGCA layouts print around registrations
 * ("VT-EJG," / "(VT-ABC)" / "VT-ANA."). Modern layouts print bare tokens, so this is
 * a no-op there.
 */
export function stripRegPunctuation(s: string): string {
  return s.replace(/^[([{'"\u2018\u201c]+/, "").replace(/[),;:.\]}'"\u2019\u201d]+$/, "").trim();
}

/** Normalise a registration token like "VT-ANA", "VTANA", "vt-ana", "VT-ANA," to "VT-ANA". */
export function normalizeReg(s: string): string | null {
  const t = stripRegPunctuation(s).toUpperCase().replace(/\s+/g, "");
  if (REG_FULL.test(t)) return t;
  if (REG_NOHYPHEN.test(t)) return `VT-${t.slice(2)}`;
  return null;
}

/** True for a bare "VT-" / "VT" fragment left behind by a line break. */
export function isRegPrefix(s: string): boolean {
  return REG_PREFIX_ONLY.test(stripRegPunctuation(s).toUpperCase());
}

/** True for the "ANA" half of a registration split across two lines. */
export function isRegSuffix(s: string): boolean {
  return REG_SUFFIX_ONLY.test(stripRegPunctuation(s).toUpperCase());
}

/** The three letters of a split registration suffix, without punctuation. */
export function regSuffix(s: string): string {
  return stripRegPunctuation(s).toUpperCase();
}

/** "30.06.2028" -> "2028-06-30" */
export function parseDmy(s: string): string | null {
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Read the "as on" date the DGCA prints under the title. Every wording the lists have
 * used is accepted: "(Updated as on 31.08.2026)", "(as on 10-02-2016)",
 * "(updated as on 15.7.2011)", "AS ON 31st January, 2023", "AS ON 15th JUNE, 2023".
 */
export function parseAsOn(text: string): string | null {
  const m = /as\s+on\s*:?\s*(.{1,40})/i.exec(text.replace(/\s+/g, " "));
  if (!m) return null;
  const tail = m[1];
  const dotted = /^\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{4})/.exec(tail);
  if (dotted) return iso(+dotted[3], +dotted[2], +dotted[1]);
  const worded = /^\s*(\d{1,2})\s*(?:st|nd|rd|th)?[\s,.]*([A-Za-z]{3,9})[\s,.]+(\d{4})/.exec(tail);
  if (worded) {
    const mo = MONTHS[worded[2].slice(0, 3).toLowerCase()];
    if (mo) return iso(+worded[3], mo, +worded[1]);
  }
  const reversed = /^\s*([A-Za-z]{3,9})[\s,.]+(\d{1,2})\s*(?:st|nd|rd|th)?[\s,.]+(\d{4})/.exec(tail);
  if (reversed) {
    const mo = MONTHS[reversed[1].slice(0, 3).toLowerCase()];
    if (mo) return iso(+reversed[3], mo, +reversed[2]);
  }
  return null;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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
