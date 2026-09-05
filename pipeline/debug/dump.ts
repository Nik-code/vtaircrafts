// Usage: npx tsx pipeline/debug/dump.ts <pdf> <page-index> [<page-index>...]
import { extractWords, groupRows } from "../lib/bbox";

const [pdf, ...pagesArg] = process.argv.slice(2);
const pages = extractWords(pdf);
const wanted = pagesArg.length ? pagesArg.map(Number) : pages.map((p) => p.index);
for (const i of wanted) {
  const p = pages[i];
  console.log(`\n===== page ${i} (${p.width}x${p.height}) words=${p.words.length}`);
  for (const row of groupRows(p.words)) {
    const y = row[0].cy.toFixed(0).padStart(3);
    console.log(`${y} | ` + row.map((w) => `${w.x0.toFixed(0)}:${w.text}`).join("  "));
  }
}
