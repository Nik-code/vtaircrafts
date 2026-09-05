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
- **Change log** going back to 2005: exact-dated registrations, de-registrations and
  ownership changes from DGCA's own reports, plus additions, removals and operator moves
  between 73 archived snapshots of the two operator lists.
- **Downloads**: `aircraft.json`, `aircraft.csv`, `operators.json`, `changes.json`,
  `events.json`, `snapshots.json`, `meta.json`, plus a GitHub Release per snapshot.

## How it works

```
DGCA PDFs ──▶ pdftotext -bbox-layout ──▶ positional parsers ──▶ normalise ──▶ enrich ──▶ snapshot JSON/CSV ──▶ Next.js static site
                     ▲                                                            ▲
   Wayback captures ─┘                                    DGCA registration reports
   of the same lists                                      (exact dates per airframe)
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
4. `pipeline/history.ts` builds the historical record, and is run by hand rather than
   monthly because its inputs never change:
   - it enumerates every Wayback Machine capture of the two operator lists (across all
     the URLs they have lived at since 2004) with the CDX API, downloads each unique
     digest, rejects anything that is not a PDF, parses it with the same parsers, reads
     the "as on" date printed on page 1, and writes `data/parsed/history/<list>/<date>.json`;
   - it downloads and parses DGCA's registration, de-registration and change-of-ownership
     reports (2009-2013 and Q1 2019, the only ones published) into
     `data/parsed/reports/`. These are the only public DGCA documents that carry an exact
     date per airframe.
5. `pipeline/build.ts` normalises operator names, classifies models into types,
   adds hex codes and ICAO designators from the tar1090 aircraft database, picks
   representative photos for tails without one (same type and operator, else
   same type), builds the event log from the whole snapshot chain plus the reports,
   and writes the snapshot plus a diff against the previous one.
6. The Next.js app is a static export that reads `data/latest/` at build time.

A GitHub Actions workflow runs fetch → parse → images → build on the 3rd of every month
and commits the new snapshot; the new snapshot simply extends the chain, so the event log
grows without re-reading the archive. Deploys happen from `main`.

## Run it locally

```bash
brew install poppler          # pdftotext
npm install
npm run pipeline:history                       # once: archived snapshots + DGCA reports
npm run pipeline:parse data/raw/2026-08-31
npm run pipeline:images data/parsed/2026-08-31
npm run pipeline:build 2026-08-31 -- --previous 2024-06-10
npm run dev
```

`pipeline:history` is idempotent and skips anything already on disk; add `--no-fetch` to
re-parse without touching the network.

## Data notes

- Registrations are unique across the dataset. The two DGCA lists do not overlap.
- **Dates.** An event is either exactly dated or interval dated, never guessed. `registered`,
  `deregistered` and `owner-change` carry a `date` straight from a DGCA report. `added`,
  `removed` and `moved` carry `from`/`to`: the two snapshot dates the change happened
  between. Where a snapshot PDF prints no "as on" date, the Wayback capture date is used
  and the parse records a warning.
- **`firstSeen`** is the earliest snapshot in the whole chain in which a registration
  appears, archived captures included, so it can predate this repo's own first fetch. It
  is when DGCA first listed the tail on a commercial permit, not when the aircraft was
  registered; `history.registeredOn` is the registration date when a report supplies one.
- **Reused registrations.** DGCA reissues tails, so a report row is only attached to
  today's aircraft when the type in the report is the same kind of machine as the type
  flying now. Where they disagree the fields stay null rather than describing a different
  airframe.
- **Operator identity** is resolved through `identifyOperator`, so a rename (AIX Connect →
  Air India Express, Air India Charters → Air India Express, Airline Allied Services →
  Alliance Air) is not reported as a fleet-wide transfer. The older exports also print the
  operator column narrower and truncate long names; an id that only extends another and
  never appears alongside it in the same list on the same day is treated as the same
  company. And a tail that reads as operator A, then B, then A across three consecutive
  snapshots is treated as one misread snapshot rather than two transfers, so neither move
  is reported.
- **Coverage gaps.** The Archive holds no usable capture of either list between February
  2020 and January 2023: for that period the site kept the PDFs behind a JavaScript
  viewer, and only the wrapper HTML was archived. Registration reports exist only for
  October 2009 - August 2013 and January - March 2019; DGCA has published none since.
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
