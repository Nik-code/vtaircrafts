import { execFileSync } from "node:child_process";

export interface Word {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text: string;
  /** vertical centre, handy for row grouping */
  cy: number;
}

export interface Page {
  index: number;
  width: number;
  height: number;
  words: Word[];
}

const PAGE_RE = /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g;
const WORD_RE =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Run poppler's pdftotext in bbox-layout mode and return per-page words. */
export function extractWords(pdfPath: string): Page[] {
  const xml = execFileSync("pdftotext", ["-bbox-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return parseBboxXml(xml);
}

export function parseBboxXml(xml: string): Page[] {
  const pages: Page[] = [];
  let pm: RegExpExecArray | null;
  let index = 0;
  while ((pm = PAGE_RE.exec(xml))) {
    const words: Word[] = [];
    let wm: RegExpExecArray | null;
    WORD_RE.lastIndex = 0;
    const body = pm[3];
    while ((wm = WORD_RE.exec(body))) {
      const x0 = +wm[1];
      const y0 = +wm[2];
      const x1 = +wm[3];
      const y1 = +wm[4];
      const text = decodeEntities(wm[5]).trim();
      if (!text) continue;
      words.push({ x0, y0, x1, y1, text, cy: (y0 + y1) / 2 });
    }
    words.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    pages.push({ index, width: +pm[1], height: +pm[2], words });
    index += 1;
  }
  return pages;
}

/** Group words into visual rows: words whose vertical centres are within `tol` points. */
export function groupRows(words: Word[], tol = 3.5): Word[][] {
  const sorted = [...words].sort((a, b) => a.cy - b.cy || a.x0 - b.x0);
  const rows: Word[][] = [];
  for (const w of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].cy - w.cy) <= tol) {
      last.push(w);
    } else {
      rows.push([w]);
    }
  }
  for (const r of rows) r.sort((a, b) => a.x0 - b.x0);
  return rows;
}

export function inCol(w: Word, x0: number, x1: number): boolean {
  const mid = (w.x0 + w.x1) / 2;
  return mid >= x0 && mid < x1;
}

export function joinText(words: Word[]): string {
  return words.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
}
