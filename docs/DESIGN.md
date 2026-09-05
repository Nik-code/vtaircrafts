# vtaircrafts.in design language: "Flight Test Sheet"

The site reads like an engineering drawing set for the Indian commercial fleet: a
paper sheet with a title block, dimension lines, hatched bars, riveted photo
plates, and stencil numerals. Precise, calm, a little obsessive. Nothing glows.
Nothing is "cyber". This is drafting-room craft applied to a public dataset.

## Principles

1. **Paper, ink, one signal colour.** Warm paper ground, deep ink, flight-test
   orange used only for the thing that matters on the screen (one accent per view).
2. **Everything is annotated.** Numbers carry units and sources. Sections carry
   sheet numbers. Photos carry figure numbers and credits. Labels never truncate;
   if a name does not fit, the layout changes, not the name.
3. **Aerodynamic geometry, engineered motion.** Streamlines, airfoil sections and
   plan-view silhouettes are the decorative vocabulary. Motion is short (150 to
   400ms), eased like a damped control surface, and disabled under
   prefers-reduced-motion.
4. **Data density with air.** Dense tables are fine; cramped ones are not. 8px
   grid, generous section spacing, thin rules instead of boxes wherever possible.
5. **Every aircraft has a photograph.** The UI never counts, mentions or apologises
   for image coverage. A representative photo is simply the photo; a small
   "representative" note under it is the only acknowledgement.

## Tokens (see `src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F3F0E8` | page ground |
| `--paper-2` | `#EAE6DA` | panels, table stripes |
| `--paper-3` | `#DFD9CA` | pressed states, hatch background |
| `--ink` | `#12213A` | text, rules, primary marks |
| `--ink-2` | `#4A5568` | secondary text |
| `--ink-3` | `#8A93A3` | dim text, disabled |
| `--rule` | `#CFC9BA` | hairlines |
| `--rule-2` | `#A79F90` | stronger rules, borders on plates |
| `--blue` | `#0B2E5A` | blueprint panel ground |
| `--blue-line` | `rgba(255,255,255,0.22)` | lines on blueprint |
| `--signal` | `#FF4F00` | the accent; markers, active states, key number |
| `--mint` | `#0F8B7A` | non-scheduled / secondary status |
| `--caution` | `#B4461E` | removals, expiries |

Type: **Barlow Condensed** (`.display`) for headings and big numerals, uppercase
with `letter-spacing: 0.02em` for headings and tight tracking for numerals;
**Barlow** for body; **Azeret Mono** (`.mono`, `.label`) for data, labels and
codes. Labels are uppercase, 11px, `letter-spacing: 0.14em`.

## Motifs and where they live

- **Sheet frame**: the page content sits inside a 1px ink border with a title
  block at the bottom (the footer). Corners get a tiny cross-hair tick.
- **Title block** (`TitleBlock`): section headers with fields: SHEET, TITLE, REV
  (snapshot date), SOURCE. Used at the top of every page and major section.
- **Dimension line** (`Dimension`): a horizontal line with end ticks and a centred
  value, used to annotate charts and hero numbers ("1,306 AIRCRAFT").
- **Hatch** (`HatchDefs`, `HatchBar`): 45° hatching for bars and area fills.
  Scheduled = ink hatch; non-scheduled = mint hatch; highlight = signal solid.
- **Plate** (`Plate`): a photo inside a 1px `--rule-2` border with four rivet dots
  and a caption "FIG. 12  VT-ANA  Boeing 787-8  ·  Photo D. Kirk, CC BY 4.0".
- **Stamp** (`Stamp`): rubber-stamp style tag for categories: SCHEDULED, NSOP,
  ROTARY, CARGO, REPRESENTATIVE, EXPIRING.
- **Streamlines** (`Streamlines`): SVG curves flowing around an airfoil, gently
  animated; used on the blueprint hero panel and as faint page background on
  section breaks.
- **Runway stripes**: threshold-stripe divider (`.threshold`) between major
  sections.
- **Silhouettes** (`Silhouette`): plan-view fixed-wing, rotary and balloon
  outlines, used as the placeholder inside a plate and as tiny glyphs in charts.

## Motion

- Numbers count up on first view (`CountUp`), 600ms, ease-out, once.
- Plates fade and rise 8px on enter (CSS `animation: rise`), staggered by index
  up to 6 items.
- Streamlines: dash-offset drift, 12s linear loop, opacity 0.35.
- Hover on rows: background to `--paper-2`, 120ms. Hover on plates: border to
  `--ink`, caption underline. No scale transforms larger than 1.01.
- All animation wrapped in `@media (prefers-reduced-motion: no-preference)`.

## Words

Sentence case for prose, uppercase only for labels and stencil headings. No
exclamation marks. Numbers use Indian grouping (1,306). Dates as `31 Aug 2026`.
Say "DGCA list" not "register". Say "representative photo" when a photo is of a
sibling airframe. Never mention how many aircraft have photos.
