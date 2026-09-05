import type { Page, Word } from "./bbox";

/**
 * The DGCA PDFs are "Print to PDF" exports of a spreadsheet. On every page the
 * header row of operator #1 is stamped on top of the real content of that row
 * (a frozen-row artefact). Detect words that recur at the identical position on
 * most pages inside the header zone and strip one instance of each per page.
 */
export function removeRecurringOverlay(pages: Page[], opts?: { yMin?: number; yMax?: number }): {
  pages: Page[];
  overlay: Word[];
} {
  if (pages.length < 3) return { pages, overlay: [] };
  const yMin = opts?.yMin ?? 135;
  const yMax = opts?.yMax ?? 170;
  // Cluster header-zone words by (text, x) across pages; y may drift by a few points.
  const clusters: Array<{ text: string; x0: number; x1: number; cy: number; pages: Set<number> }> = [];
  for (const p of pages) {
    for (const w of p.words) {
      if (w.cy < yMin || w.cy > yMax) continue;
      let c = clusters.find((k) => k.text === w.text && Math.abs(k.x0 - w.x0) <= 3 && Math.abs(k.cy - w.cy) <= 5);
      if (!c) {
        c = { text: w.text, x0: w.x0, x1: w.x1, cy: w.cy, pages: new Set() };
        clusters.push(c);
      }
      c.pages.add(p.index);
    }
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  const overlayClusters = clusters.filter((c) => c.pages.size >= threshold);
  const overlay: Word[] = overlayClusters.map((c) => ({ text: c.text, x0: c.x0, x1: c.x1, y0: c.cy, y1: c.cy, cy: c.cy }));
  if (!overlayClusters.length) return { pages, overlay };

  const cleaned = pages.map((p, i) => {
    // Page 0 carries the genuine header of operator #1; keep it intact.
    if (i === 0) return p;
    const used = new Set<number>();
    const words = p.words.filter((w) => {
      if (w.cy < yMin || w.cy > yMax) return true;
      const idx = overlayClusters.findIndex(
        (c, ci) => !used.has(ci) && c.text === w.text && Math.abs(c.x0 - w.x0) <= 3 && Math.abs(c.cy - w.cy) <= 5,
      );
      if (idx >= 0) {
        used.add(idx);
        return false;
      }
      return true;
    }).filter((w) => {
      // Second pass: the renderer sometimes splits an overlaid word into fragments
      // ("#17/2025" -> "#" + "17/2025"). Drop fragments that sit inside an overlay word's box.
      if (w.cy < yMin || w.cy > yMax) return true;
      const idx = overlayClusters.findIndex(
        (c, ci) => !used.has(ci) && c.text !== w.text && w.text.length >= 3 && c.text.includes(w.text) &&
          w.x0 >= c.x0 - 3 && w.x1 <= c.x1 + 3 && Math.abs(c.cy - w.cy) <= 5,
      );
      if (idx >= 0) {
        used.add(idx);
        return false;
      }
      return true;
    });
    return { ...p, words };
  });
  return { pages: cleaned, overlay };
}
