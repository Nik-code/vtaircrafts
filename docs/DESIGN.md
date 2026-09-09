# vtaircrafts.in design language

A plain, readable reference site. The data is the design: big numbers, clear
lists, good photographs, and nothing decorative competing with them. Mobile
first; every layout is built for a 390px screen and then given room on desktop.

This replaced the earlier "flight test sheet" language (title blocks, rivets,
hatching, dimension lines, tiny tracked mono labels) in September 2026 after
readers found it busy, small and low-contrast.

## Principles

1. **Readable before clever.** Body text is 16px, secondary text never smaller
   than 13px, and every text colour clears WCAG AA on its background. No
   uppercase tracked micro-labels; the one eyebrow style is 13px and used once
   per page.
2. **One accent.** Orange marks arrivals, active states and the nose light on the
   logo. Teal is reserved for non-scheduled. Everything else is grey scale.
3. **Whitespace does the structuring.** Sections are separated by a hairline and
   64 to 80px of space, not by boxes. Cards are used only where a thing is
   clickable as a whole (fleet cards, operator cards, tables).
4. **Lists, not charts.** Proportions are shown as a name, a number and a thin
   bar. No custom SVG visualisations on the home page.
5. **Every aircraft has a photograph.** A silhouette stands in quietly when there
   is none. A representative photo is noted in the credit line, never with a
   stamp on the image.

## Tokens (see `src/app/globals.css`)

Dark is the default; light swaps the same roles.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0c0c0d` | `#f6f4ef` | page |
| `--bg-2` | `#151517` | `#ffffff` | cards, inputs, row hover |
| `--bg-3` | `#1f1f22` | `#ebe8e0` | hover on cards, badges, bar track |
| `--fg` | `#f4f2ed` | `#151518` | primary text |
| `--fg-2` | `#b5b2aa` | `#52525a` | secondary text |
| `--fg-3` | `#8b8881` | `#75757d` | tertiary text, labels |
| `--line` | `#262629` | `#e3e0d7` | hairlines |
| `--line-2` | `#38383d` | `#cfcbc1` | input and chip borders |
| `--accent` | `#ff6b2c` | `#e2500c` | arrivals, active, links on hover |
| `--teal` | `#5fcdb4` | `#0f8f77` | non-scheduled |
| `--danger` | `#f08a6a` | `#c8482a` | removals, expiring permits |

Type: **Inter Variable** for everything, with `cv11 ss01 ss03` for the
single-storey a and open forms. **JetBrains Mono Variable** (`.mono`) only for
registrations, hex codes, permit numbers and file names. Headings use
`.h1` / `.h2` / `.h3`; the big count uses `.display` at `clamp(88px, 22vw, 200px)`.

Radii: 8px controls, 12px cards and photos, pills for buttons, chips and badges.

## Components (`src/components/ui`)

- `Container` (1120px, or 1400px `wide` for the fleet), `PageHeader`,
  `SectionHeader`.
- `Badge` and `ListBadge` (Scheduled / Non-scheduled).
- `Button` / `ButtonLink`: primary (solid) and secondary (outline), pill shaped,
  44px tall for touch.
- `Photo` and `PhotoCredit`: rounded frame, silhouette fallback, one-line credit.
- `Bar`: thin proportional bar on a `--bg-3` track.
- `Field`: label over value, the building block of every fact list.
- Chips (`.chip`, `.chip-on`) for filters and sibling registrations.

## Layout rules

- Nav: 56px bar with logo, inline links on desktop, and a 44px tab row of the
  four sections under it on mobile. Search and theme toggle are icon buttons.
- Fleet filters live in a sticky 280px rail on desktop and a bottom sheet on
  mobile, with a "Show N aircraft" button to close it.
- Tables collapse columns by breakpoint rather than shrinking text; on the
  narrowest screens the operator folds under the type.
- Grid items carry `min-w-0` so truncated text never widens the page.

## Motion

- Numbers count up once on first view (`CountUp`), 600 to 900ms.
- Rows and cards change background on hover in 120 to 160ms.
- The search palette rises 6px on open. Nothing else moves.
- All of it is inside `@media (prefers-reduced-motion: no-preference)`.

## Words

Sentence case everywhere. Say "DGCA list" not "register". Say "representative
photo" when a photo is of a sibling airframe. Never mention how many aircraft
have photos. Dates as `31 Aug 2026`, numbers with Indian grouping.
