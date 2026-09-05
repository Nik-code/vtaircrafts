// Renders the social share card (Open Graph / Twitter / WhatsApp) to public/og.png.
//
// The card is the hero redrawn at 1200×630: the aircraft count on the blueprint sheet
// and the column waffle of every aircraft, one mark each, from the same layout the site
// uses. It is regenerated on every build (see the prebuild script) so the number and the
// field always match the deployed snapshot.
//
// Fonts are the site's own faces as TTF (assets/fonts, SIL Open Font Licence).
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { apronGroups } from "../src/components/home/derive";
import { layoutApron } from "../src/components/home/apron";
import { getMeta } from "../src/lib/data";
import { fmtDate, fmtInt } from "../src/lib/format";

const W = 1200;
const H = 630;
const PAPER = "#F3F0E8";
const BLUE = "#0B2E5A";
const SIGNAL = "#FF4F00";
const MINT = "#8DC2B7";
const MARK_PAPER = "#EFEBE0";

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function card(): string {
  const meta = getMeta();
  const total = meta.counts.aircraft;
  const rev = fmtDate(meta.snapshot);
  const layout = layoutApron(apronGroups());

  // The waffle field, marks only: fitted into the band under the headline.
  const minY = Math.min(...layout.marks.map((m) => m.y)); // callout headroom sits above this
  const fieldW = layout.width;
  const fieldH = layout.rows * 12; // PITCH
  const bandX0 = 64;
  const bandX1 = W - 64;
  const bandY0 = 306;
  const bandY1 = H - 66;
  const scale = Math.min((bandX1 - bandX0) / fieldW, (bandY1 - bandY0) / fieldH);
  const fw = fieldW * scale;
  const ox = r2((W - fw) / 2);
  const oy = r2(bandY0);
  const side = r2(8.64 * scale);
  const half = r2(side / 2);

  let marks = "";
  for (const m of layout.marks) {
    const x = r2(ox + (m.x + 1.68) * scale); // 1.68 = MARK_OFFSET in layoutApron
    const y = r2(oy + (m.y - minY + 1.68) * scale);
    const fill = m.key === "s" ? MARK_PAPER : MINT;
    if (m.a.wing === "B") {
      marks += `<circle cx='${r2(x + half)}' cy='${r2(y + half)}' r='${half}' fill='${fill}'/>`;
    } else if (m.a.wing === "RW") {
      marks += `<rect x='${x}' y='${y}' width='${side}' height='${side}' rx='1' fill='${fill}'/><path d='M${x} ${y}l${side} ${side}M${r2(x + side)} ${y}l-${side} ${side}' stroke='${BLUE}' stroke-width='0.7'/>`;
    } else {
      marks += `<rect x='${x}' y='${y}' width='${side}' height='${side}' rx='1' fill='${fill}'/>`;
    }
  }

  // Faint drafting grid.
  let grid = "";
  for (let x = 0; x <= W; x += 30) grid += `<line x1='${x}' y1='0' x2='${x}' y2='${H}'/>`;
  for (let y = 0; y <= H; y += 30) grid += `<line x1='0' y1='${y}' x2='${W}' y2='${y}'/>`;

  // Sheet frame with corner ticks.
  const F = 24;
  const tick = 14;
  const frame =
    `<rect x='${F}' y='${F}' width='${W - 2 * F}' height='${H - 2 * F}' fill='none' stroke='${PAPER}' stroke-opacity='0.28'/>` +
    [
      [F, F, 1, 1],
      [W - F, F, -1, 1],
      [F, H - F, 1, -1],
      [W - F, H - F, -1, -1],
    ]
      .map(([x, y, sx, sy]) => `<path d='M${x} ${y + sy * tick}V${y}H${x + sx * tick}' fill='none' stroke='${PAPER}' stroke-opacity='0.7' stroke-width='1.5'/>`)
      .join("");

  // Logo mark (same geometry as src/components/Logo.tsx) at the top right.
  const logo = (x: number, y: number, s: number) =>
    `<g transform='translate(${x} ${y}) scale(${s})' fill='none' stroke='${PAPER}'>` +
    `<rect x='1' y='1' width='28' height='22' stroke-width='1.4'/>` +
    `<path d='M1 5.5H3.5M1 18.5H3.5M29 5.5H26.5M29 18.5H26.5' stroke-width='1' stroke-linecap='square'/>` +
    `<path d='M15 3 L16 7 L26 12 L26 13.2 L16.5 14 L21 18.5 L21 19.5 L16 19.7 L15 21.5 L14 19.7 L9 19.5 L9 18.5 L13.5 14 L4 13.2 L4 12 L14 7 Z' fill='${PAPER}' stroke='none'/>` +
    `<circle cx='15' cy='4.3' r='1' fill='${SIGNAL}' stroke='none'/></g>`;

  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>` +
    `<rect width='${W}' height='${H}' fill='${BLUE}'/>` +
    `<g stroke='${PAPER}' stroke-opacity='0.055' stroke-width='1'>${grid}</g>` +
    frame +
    // top row: label left, wordmark right
    `<text x='64' y='84' font-family='Azeret Mono' font-size='15' letter-spacing='2.4' fill='${PAPER}' fill-opacity='0.62'>INDIA · COMMERCIAL FLEET · DGCA OPERATOR LISTS</text>` +
    logo(W - 64 - 30 * 1.1 - 156, 60, 1.1) +
    `<text x='${W - 64}' y='84' text-anchor='end' font-family='Barlow Condensed' font-weight='600' font-size='26' letter-spacing='1' fill='${PAPER}'>VT<tspan fill='${SIGNAL}'>·</tspan>AIRCRAFTS</text>` +
    // the number and its sentence
    `<text x='58' y='262' font-family='Barlow Condensed' font-weight='600' font-size='214' letter-spacing='-4' fill='${PAPER}'>${fmtInt(total)}</text>` +
    `<text x='560' y='214' font-family='Barlow' font-size='27' fill='${PAPER}' fill-opacity='0.86'>aircraft on India's scheduled and</text>` +
    `<text x='560' y='250' font-family='Barlow' font-size='27' fill='${PAPER}' fill-opacity='0.86'>non-scheduled operator permits</text>` +
    // the field
    `<g>${marks}</g>` +
    // footer line
    `<line x1='64' y1='${H - 44}' x2='${W - 64}' y2='${H - 44}' stroke='${PAPER}' stroke-opacity='0.25'/>` +
    `<text x='64' y='${H - 24}' font-family='Azeret Mono' font-size='13' letter-spacing='2' fill='${PAPER}' fill-opacity='0.6'>VTAIRCRAFTS.IN · REV ${esc(rev.toUpperCase())}</text>` +
    `<text x='${W - 64}' y='${H - 24}' text-anchor='end' font-family='Azeret Mono' font-size='13' letter-spacing='2' fill='${PAPER}' fill-opacity='0.6'>ONE MARK PER AIRCRAFT · OPEN DATA · CC BY 4.0</text>` +
    `</svg>`
  );
}

function main() {
  const fontsDir = join("assets", "fonts");
  const fontFiles = readdirSync(fontsDir)
    .filter((f) => f.endsWith(".ttf"))
    .map((f) => join(fontsDir, f));
  const svg = card();
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Barlow" },
  })
    .render()
    .asPng();
  mkdirSync("public", { recursive: true });
  writeFileSync(join("public", "og.png"), png);
  const out = process.argv[2];
  if (out) writeFileSync(out, svg);
  console.log(`public/og.png ${W}x${H} ${(png.length / 1024).toFixed(0)} KB`);
}

main();
