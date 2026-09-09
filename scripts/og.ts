// Renders the social share card (Open Graph / Twitter / WhatsApp) to public/og.png.
//
// The card is the home page hero at 1200×630: the aircraft count set large on the
// dark ground, one plain sentence, and a quiet field of dots underneath with one
// dot per aircraft (scheduled in off-white, non-scheduled in teal). It is
// regenerated on every build (see the prebuild script) so the number and the field
// always match the deployed snapshot.
//
// Fonts are the site's own faces as TTF (assets/fonts, SIL Open Font Licence).
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { getAircraft, getMeta } from "../src/lib/data";
import { fmtDate, fmtInt } from "../src/lib/format";

const W = 1200;
const H = 630;
const BG = "#0c0c0d";
const FG = "#f4f2ed";
const FG2 = "#b5b2aa";
const FG3 = "#8b8881";
const LINE = "#262629";
const ACCENT = "#ff6b2c";
const TEAL = "#5fcdb4";

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function card(): string {
  const meta = getMeta();
  const total = meta.counts.aircraft;
  const rev = fmtDate(meta.snapshot);

  // One dot per aircraft, scheduled first, packed into rows across the band under
  // the sentence. Pitch is chosen so every aircraft fits in the band.
  const aircraft = [...getAircraft()].sort((a, b) => (a.category === b.category ? 0 : a.category === "scheduled" ? -1 : 1));
  const x0 = 64;
  const x1 = W - 64;
  const y0 = 392;
  const y1 = H - 76;
  const bandW = x1 - x0;
  const bandH = y1 - y0;
  let pitch = Math.sqrt((bandW * bandH) / aircraft.length);
  let cols = Math.floor(bandW / pitch);
  let rows = Math.ceil(aircraft.length / cols);
  while (rows * pitch > bandH) {
    pitch -= 0.25;
    cols = Math.floor(bandW / pitch);
    rows = Math.ceil(aircraft.length / cols);
  }
  const r = r2(pitch * 0.22);
  const fieldW = cols * pitch;
  const ox = r2(x0 + (bandW - fieldW) / 2 + pitch / 2);
  const oy = r2(y0 + pitch / 2);
  let dots = "";
  aircraft.forEach((a, i) => {
    const cx = r2(ox + (i % cols) * pitch);
    const cy = r2(oy + Math.floor(i / cols) * pitch);
    const fill = a.category === "scheduled" ? FG : TEAL;
    dots += `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}' fill-opacity='${a.category === "scheduled" ? 0.8 : 0.95}'/>`;
  });

  // Logo mark (same geometry as src/components/Logo.tsx) at the top left.
  const logo = (x: number, y: number, s: number) =>
    `<g transform='translate(${x} ${y}) scale(${s})' fill='none' stroke='${FG}'>` +
    `<rect x='1' y='1' width='28' height='22' rx='5' stroke-width='1.6'/>` +
    `<path d='M15 3.5 L16 7 L26 12 L26 13.2 L16.5 14 L21 18.5 L21 19.5 L16 19.7 L15 21.5 L14 19.7 L9 19.5 L9 18.5 L13.5 14 L4 13.2 L4 12 L14 7 Z' fill='${FG}' stroke='none'/>` +
    `<circle cx='15' cy='4.6' r='1.1' fill='${ACCENT}' stroke='none'/></g>`;

  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>` +
    `<rect width='${W}' height='${H}' fill='${BG}'/>` +
    // wordmark
    logo(64, 52, 1.2) +
    `<text x='108' y='75' font-family='Inter' font-weight='600' font-size='22' letter-spacing='-0.3' fill='${FG}'>VT Aircrafts</text>` +
    `<text x='${W - 64}' y='75' text-anchor='end' font-family='Inter' font-weight='500' font-size='16' fill='${FG3}'>India · commercial fleet · as on ${esc(rev)}</text>` +
    // the number
    `<text x='58' y='248' font-family='Inter' font-weight='700' font-size='176' letter-spacing='-8' fill='${FG}'>${fmtInt(total)}</text>` +
    // the sentence
    `<text x='64' y='324' font-family='Inter' font-weight='500' font-size='30' letter-spacing='-0.5' fill='${FG}'>aircraft on India's scheduled and non-scheduled operator permits,</text>` +
    `<text x='64' y='362' font-family='Inter' font-weight='500' font-size='30' letter-spacing='-0.5' fill='${FG2}'>rebuilt every month from DGCA's own lists.</text>` +
    // the field
    `<g>${dots}</g>` +
    // footer
    `<line x1='64' y1='${H - 52}' x2='${W - 64}' y2='${H - 52}' stroke='${LINE}'/>` +
    `<text x='64' y='${H - 26}' font-family='JetBrains Mono' font-weight='500' font-size='14' fill='${FG3}'>vtaircrafts.in</text>` +
    `<g font-family='Inter' font-weight='500' font-size='14' fill='${FG3}'>` +
    `<circle cx='${W - 64 - 318}' cy='${H - 31}' r='4' fill='${FG}' fill-opacity='0.8'/>` +
    `<text x='${W - 64 - 306}' y='${H - 26}'>${fmtInt(meta.counts.scheduled)} scheduled</text>` +
    `<circle cx='${W - 64 - 166}' cy='${H - 31}' r='4' fill='${TEAL}'/>` +
    `<text x='${W - 64 - 154}' y='${H - 26}'>${fmtInt(meta.counts.nonScheduled)} non-scheduled</text>` +
    `</g>` +
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
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Inter" },
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
