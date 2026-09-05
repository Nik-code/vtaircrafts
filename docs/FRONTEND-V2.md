# Frontend v2 brief (2026-09-05)

Read `docs/DESIGN.md` first. It is binding. This document adds the owner's feedback on the
current build and the contracts every agent works to.

## Owner's verdict on the current UI

"The UI seems very generic. The first page shouldn't feel like a dashboard. It should have
some data but it should mostly be an aviation UI masterpiece. I want visuals, not cards full
of numbers."

Hard rules he has given (they still hold):
- No search bar in the hero. No photo-coverage stats anywhere. Never write "every aircraft
  has a photo". Never show DGCA count-mismatch notes.
- Labels never truncate. If a name does not fit, the layout changes.
- Every aircraft shows a photo (or the fixed-wing / rotary / balloon silhouette placeholder
  from `ui/Silhouette.tsx` while it loads). Representative photos are simply the photo.
- Dates as `31 Aug 2026`. Numbers in Indian grouping via `fmtInt`. Sentence case prose.
- Nothing glows. Nothing is "cyber". No Tailwind rainbow palettes. Colours come from the
  tokens in `src/app/globals.css` only: paper/ink/blue/mint/signal/caution plus tints of
  those and hatch patterns for differentiation.

## Engineering rules for every agent

- **File ownership is strict.** Edit only the files listed for you. Create new files only
  inside your area. Never touch `src/app/globals.css`, `src/components/ui/*`, `src/lib/*`,
  `pipeline/*`, `data/*`. If you need keyframes or bespoke CSS, put a `*.module.css` next to
  your component. Tailwind v4 arbitrary values are available (`text-[11px]`, etc.).
- **Server components by default.** Mark `"use client"` only for the piece that needs state
  or effects, and keep that piece small. The home page HTML must stay under 400 KB; the log
  page under 300 KB (it currently embeds 3 MB of events: load `/data/latest/events.json`
  client-side the way `components/fleet/indexData.ts` loads the fleet index).
- **Deterministic rendering.** No `Math.random`, `Date.now`, or locale-dependent output in
  render paths. SVG geometry rounded to 2 decimals so server and client agree.
- **Motion is CSS only.** 150 to 400 ms, eased. Long loops (a reel, a ticker) may run
  slower. Everything inside `@media (prefers-reduced-motion: no-preference)`. No staggered
  per-element delays that make pieces pop in one after another: that was the "glitchy" look
  the owner rejected in the current engine chart.
- **Verify** with `npm run lint && npm run typecheck`, then `curl -s localhost:3210/<page> | wc -c`
  and a grep for `Error` in the HTML. The dev server is already running on port 3210 with
  the fresh data; do not restart it, do not run `npm run build`, do not use browser tools
  (the orchestrator does visual QA and will send fixes back).
- Existing helpers: `src/lib/format.ts` (`fmtInt`, `fmtDate`, `thumb`), `src/lib/data.ts`
  (server-side readers), `src/components/home/derive.ts` (typeRows, permitHorizon,
  recentMovements, plateSelection, operatorsBySize), `src/components/ui/*` (TitleBlock,
  Dimension, Stamp, Hatch, Silhouette, Plate, CountUp, Streamlines, Button).
- Types: `src/lib/types.ts` (`Aircraft`, `Operator`, `Event`, `SnapshotInfo`, `Meta`,
  `IndexRecord`, `Wing`).

## Home page order (owned by home-shell in `src/app/page.tsx`)

1. Hero: visual first. Blueprint panel, apron chart kept as the visual, the aircraft count
   as the one big number, revision date, nothing else. No stats grid, no paragraph, no
   buttons, no callout.
2. Intro strip: three or four short items in one thin band: what the site shows, where the
   data comes from (the two DGCA operator-list PDFs, rebuilt monthly), and the few words a
   reader meets (scheduled vs non-scheduled permit, seats as printed by DGCA, representative
   photo, snapshot). Under 80 words total.
3. `FleetComposition`: fixed-wing share by operator drawn as one jet engine; rotary share
   drawn as a helicopter rotor. Summary, not a directory.
4. `TypeMixViz`: type mix as an aviation visual, not a bar chart.
5. `HomeTimeline`: permit horizon and recent movements on one auto-scrolling, aviation-themed
   strip. `PlateReel`: photos as an auto-scrolling film strip.
6. Thin footer: one row. Drawn from / Rev / Licence on the left; on the right the GitHub
   link and a "Made by Priyansh Nikka" link to https://priyanshnikka.com. The "How this sheet
   is drawn" section is removed (the intro strip replaces it).

## Component contracts (stubs exist; each owner replaces its stub)

```ts
// src/components/home/FleetComposition.tsx  (owner: home-composition)
export function FleetComposition(props: { operators: Operator[]; counts: Meta["counts"] }): JSX

// src/components/home/TypeMixViz.tsx  (owner: home-typemix)
export function TypeMixViz(props: { rows: TypeRow[]; total: number; wings: Record<Wing, number> }): JSX
// TypeRow is exported from src/components/home/derive.ts

// src/components/home/HomeTimeline.tsx  (owner: home-timeline)
export function HomeTimeline(props: { events: Event[]; expiries: Expiry[]; horizonStart: number; horizonMonths: number }): JSX
// Expiry is exported from src/components/home/derive.ts

// src/components/home/PlateReel.tsx  (owner: home-timeline)
export function PlateReel(props: { aircraft: Aircraft[] }): JSX
```

`page.tsx` passes: `operators` (all 150), `meta.counts`, `typeRows()` (all rows, the
component decides how many to draw), `recentMovements(24)`, `permitHorizon(30)`,
`plateSelection(12)`.
