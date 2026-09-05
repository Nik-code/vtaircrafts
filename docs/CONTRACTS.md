# Shared contracts between pipeline and site

All files are written by `pipeline/build.ts` into `data/snapshots/<date>/` and
copied to `data/latest/`; `scripts/copy-data.mjs` mirrors `data/latest` to
`public/data/latest` for static serving. Types live in `src/lib/types.ts`.

## aircraft.json: `Aircraft[]`

Unchanged fields from the first build plus:

- `image` is never null in practice; tiers are `exact`, `operator-type`,
  `type` (same type, another Indian operator) and `type-world` (same type
  anywhere, from a Commons type category). `ofReg` is null for `type-world`.
- `history`: `{ firstSnapshot: string; registeredOn: string | null;
  deregisteredOn: string | null; msn: string | null; yearOfManufacture: number | null;
  owner: string | null; lessor: string | null }`. `firstSnapshot` is the earliest
  DGCA list snapshot (including Wayback) in which the registration appears.
  `registeredOn` comes from DGCA registration reports when available.

## events.json: `Event[]`

```ts
interface Event {
  id: string;                 // stable: sha1 of kind|reg|date|from|to|source.file
  kind: "registered" | "deregistered" | "owner-change" | "added" | "removed" | "moved" | "snapshot";
  reg: string | null;
  date: string | null;        // exact ISO date when the source states one
  from: string | null;        // interval start (previous snapshot) when inferred
  to: string | null;          // interval end (snapshot where first observed)
  list: "scheduled" | "non-scheduled" | null;
  operator?: string; operatorId?: string;
  fromOperator?: string; fromOperatorId?: string;
  toOperator?: string; toOperatorId?: string;
  model?: string; type?: string; msn?: string; owner?: string; lessor?: string;
  source: { kind: "dgca" | "wayback" | "report"; file: string; url: string | null };
  note?: string;
}
```

Sorted newest first by `date ?? to`. A `snapshot` event has `reg: null` and
carries `note` with counts.

Exactly one dating scheme per event, never both: `registered` / `deregistered` /
`owner-change` come from a DGCA report and always carry `date` (with `from`/`to` null);
`added` / `removed` / `moved` are inferred from consecutive snapshots of one list and
always carry `from`/`to` (with `date` null). Render an interval event as "between
`from` and `to`", never as a point in time. `list` is null on report events.

## snapshots.json: `SnapshotInfo[]`

```ts
interface SnapshotInfo {
  date: string;                          // as-on date printed in the PDF
  list: "scheduled" | "non-scheduled";
  source: "dgca" | "wayback";
  url: string | null;
  sha256: string;
  aircraft: number;
  operators: number;
}
```

## aircraft.csv

The same records, flat. Column order is stable and new columns are appended, never
inserted: `reg, hex, operator, operator_legal, category, permit_no, permit_valid_until,
model, type_icao, type_manufacturer, type_name, wing, seats, seats_raw, role, source_file,
source_as_on, first_seen, registered_on, msn, year_of_manufacture, owner, lessor`.

## meta.json

`counts` contains only fleet facts (aircraft, operators, scheduled,
nonScheduled, fixedWing, rotary, balloons, withHex). No image statistics.
`issues` stays for transparency but the UI does not render it.

## File ownership during the redesign

- Pipeline images: `pipeline/images.ts`, `pipeline/lib/assignImages.ts`, `pipeline/warm.ts`.
- Pipeline history and build: `pipeline/history/**`, `pipeline/build.ts`, `pipeline/fetch.ts`, `data/**`.
- Site foundation (do not edit without asking): `src/app/globals.css`, `src/app/layout.tsx`,
  `src/components/ui/**`, `src/components/TopNav.tsx`, `src/components/Footer.tsx`, `src/lib/**`.
- Home: `src/app/page.tsx`, `src/components/home/**`.
- Fleet, search, operators: `src/app/fleet/**`, `src/app/operators/**`, `src/components/fleet/**`,
  `src/components/search/**`, `src/components/operators/**`.
- Aircraft, log, data pages: `src/app/aircraft/**`, `src/app/log/**`, `src/app/data/**`,
  `src/components/aircraft/**`, `src/components/log/**`, `src/components/data/**`.
