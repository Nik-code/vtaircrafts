# vtaircrafts.in

Every aircraft on an Indian scheduled or non-scheduled operator permit, as a
searchable site and an open dataset, rebuilt monthly from the DGCA's own lists.

**Live:** https://vtaircrafts.in · **Data:** [`data/latest/`](data/latest) · **Licence:** code MIT, data CC BY 4.0

## Why

India's regulator has not published a machine-readable aircraft register since
2019. What it does publish, every month, are two PDFs: the list of scheduled
operators and the list of non-scheduled operators, each with every registration,
model and seat count under that permit. This project turns those PDFs into a
versioned dataset and a site you can actually browse.

Coverage is commercial aviation only: roughly 1,300 of about 2,300 manned
aircraft on the register. Privately owned aircraft, flying schools and state
government fleets have no public list.

## What you get

- **Fleet explorer** with search by registration, hex, operator, type and model,
  faceted filters, a dense log view and a photo grid view. State lives in the URL.
- **Aircraft pages** for every tail: type, ICAO designator, Mode S hex, seats,
  permit number and validity, source page, and a photo with credit.
- **Operator pages** with type mix and full fleet lists.
- **Change log** of registrations added, removed and moved between snapshots.
- **Downloads**: `aircraft.json`, `aircraft.csv`, `operators.json`, `changes.json`,
  `meta.json`, plus a GitHub Release per snapshot.

## How it works

```
DGCA PDFs ──▶ pdftotext -bbox-layout ──▶ positional parsers ──▶ normalise ──▶ enrich ──▶ snapshot JSON/CSV ──▶ Next.js static site
```

1. `pipeline/fetch.ts` downloads both PDFs, reads the "updated as on" date, and
   stores them unmodified under `data/raw/<date>/` with hashes.
2. `pipeline/parse.ts` extracts word bounding boxes with poppler and rebuilds the
   tables. It detects columns from the header row, strips the first operator's
   header that the spreadsheet export stamps on every page, re-joins
   registrations split across lines, and validates every model group against the
   count DGCA prints beside it. Mismatches are recorded, never silently fixed.
3. `pipeline/images.ts` looks up a Wikimedia Commons category per registration
   and records the chosen photo with its author and licence.
4. `pipeline/build.ts` normalises operator names, classifies models into types,
   adds hex codes and ICAO designators from the tar1090 aircraft database, picks
   representative photos for tails without one (same type and operator, else
   same type), and writes the snapshot plus a diff against the previous one.
5. The Next.js app is a static export that reads `data/latest/` at build time.

A GitHub Actions workflow runs this on the 3rd of every month and commits the
new snapshot. Deploys happen from `main`.

## Run it locally

```bash
brew install poppler          # pdftotext
npm install
npm run pipeline:parse data/raw/2026-08-31
npm run pipeline:images data/parsed/2026-08-31
npm run pipeline:build 2026-08-31 -- --previous 2024-06-10
npm run dev
```

## Data notes

- Registrations are unique across the dataset. The two DGCA lists do not overlap.
- `seats` is the number DGCA prints; freighters and aerial-work aircraft carry
  `role` instead. Some rows read `222/232` for mixed configurations; the first
  number is used.
- Where DGCA's stated count for a model group disagrees with the registrations it
  lists, both numbers are kept and the discrepancy is shown on the data page.
- Photos are hotlinked from Wikimedia Commons and credited per image. Tails
  without a photo show a labelled representative photo or a silhouette.

## Contributing

Type classification rules live in `pipeline/lib/normalize.ts`; operator display
names and websites in the same file. Pull requests that fix a misread model,
add a missing alias, or improve the parser on a new DGCA layout are welcome.
Run `npm run lint && npm run typecheck` before opening one.
