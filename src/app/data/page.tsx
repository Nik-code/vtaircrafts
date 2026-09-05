import type { Metadata } from "next";
import { statSync } from "node:fs";
import { join } from "node:path";
import { getMeta } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { TitleBlock } from "@/components/ui/TitleBlock";

export const metadata: Metadata = {
  title: "Data & method",
  description: "Download the dataset and read how it is built, snapshot by snapshot.",
};

const FILES = [
  { name: "aircraft.json", desc: "Full aircraft records: registration, operator, type, seats, permit, image credit and history." },
  { name: "aircraft.csv", desc: "The same aircraft records as a flat CSV, for spreadsheets." },
  { name: "operators.json", desc: "Operator summaries: type mix, fleet counts and permit validity." },
  { name: "events.json", desc: "Every recorded registration, deregistration, addition, removal, move and ownership change." },
  { name: "snapshots.json", desc: "One entry per DGCA list snapshot: date, list, source, hash and counts." },
  { name: "changes.json", desc: "Added, removed and moved registrations between the two most recent snapshots." },
  { name: "meta.json", desc: "Snapshot metadata, source hashes and fleet counts." },
];

const AIRCRAFT_FIELDS: Array<[string, string]> = [
  ["reg", "Indian registration, e.g. VT-ANA."],
  ["hex", "ICAO 24-bit Mode S address, or null if not in the tar1090 database."],
  ["operatorId", "Slug of the operating company, links to /operators/<id>."],
  ["operator", "Operator's trading name."],
  ["operatorLegal", "Operator's registered legal name."],
  ["category", "\"scheduled\" or \"non-scheduled\", per the DGCA list it appears on."],
  ["permit.no", "AOC number (scheduled) or AOP number (non-scheduled)."],
  ["permit.validUntil", "Permit expiry date."],
  ["model", "Model string exactly as printed by DGCA."],
  ["type.name", "Normalised type name, e.g. \"Boeing 787-9\"."],
  ["type.icao", "ICAO type designator, e.g. B789."],
  ["type.manufacturer", "Airframe manufacturer."],
  ["wing", "\"FW\" fixed wing, \"RW\" rotary, \"B\" balloon."],
  ["seatsRaw", "Seat count exactly as printed by DGCA."],
  ["role", "passenger, cargo, aerial-work, mixed or unknown."],
  ["image", "Wikimedia Commons photo with credit and a tier (exact, operator-type, type, type-world)."],
  ["source.file / .page / .asOn", "Which DGCA PDF, which page, and its \"updated as on\" date."],
  ["firstSeen", "Date of the earliest snapshot in which this registration appears."],
  ["history", "Optional: firstSnapshot, registeredOn, deregisteredOn, msn, yearOfManufacture, owner, lessor, from DGCA registration reports."],
];

const EVENT_FIELDS: Array<[string, string]> = [
  ["kind", "registered, deregistered, owner-change, added, removed, moved, or snapshot."],
  ["reg", "Registration affected, or null for a snapshot event."],
  ["date", "Exact ISO date, when the source states one directly."],
  ["from / to", "Interval bounds when the date is only known to fall between two snapshots."],
  ["list", "scheduled or non-scheduled."],
  ["operator / fromOperator / toOperator", "Operator names involved in the change."],
  ["msn / owner / lessor", "Manufacturer serial number and ownership, where a registration report gives them."],
  ["source", "Which document the event was read from: dgca, wayback, or report."],
];

const METHOD_STEPS = [
  "Download both DGCA PDFs on a schedule, and keep the original files with their sha256 hashes for every snapshot.",
  "Parse each page positionally with poppler's word boxes, since the PDFs are spreadsheets printed flat rather than tagged tables.",
  "Strip the repeated header overlay DGCA stamps on every page, and re-join registrations that the renderer split across lines.",
  "Normalise types and enrich each record with ICAO hex addresses and type designators from the tar1090 aircraft database.",
  "Each month, snapshot the parsed lists, diff them against the previous snapshot, and select a Wikimedia Commons photo for each registration.",
];

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileSize(name: string): string {
  try {
    return fmtSize(statSync(join(process.cwd(), "data", "latest", name)).size);
  } catch {
    return "—";
  }
}

export default function DataPage() {
  const meta = getMeta();

  return (
    <main className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8">
      <TitleBlock sheet="06" title="Data & method" fields={[{ label: "Snapshot", value: fmtDate(meta.snapshot) }]} />

      <section className="mt-10">
        <h2 className="label mb-4">Downloads</h2>
        <div className="border-t border-rule-2">
          {FILES.map((f) => (
            <a
              key={f.name}
              href={`/data/latest/${f.name}`}
              download
              className="row-hover grid grid-cols-1 gap-1 border-b border-rule-2 px-2 py-3 sm:grid-cols-[10rem_1fr_5rem_11rem] sm:items-baseline sm:gap-3"
            >
              <span className="mono text-sm text-ink">{f.name}</span>
              <span className="text-sm text-ink-2">{f.desc}</span>
              <span className="mono text-xs text-ink-3">{fileSize(f.name)}</span>
              <span className="mono text-xs text-ink-3">/data/latest/{f.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-rule pt-10">
        <h2 className="label mb-4">Schema</h2>
        <div className="mb-2 text-sm text-ink-2">aircraft.json</div>
        <dl className="mb-8 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-rule pt-3 sm:grid-cols-[12rem_1fr]">
          {AIRCRAFT_FIELDS.map(([field, meaning]) => (
            <div key={field} className="contents">
              <dt className="mono text-xs text-ink">{field}</dt>
              <dd className="mb-2 text-sm text-ink-2 sm:mb-0">{meaning}</dd>
            </div>
          ))}
        </dl>
        <div className="mb-2 text-sm text-ink-2">events.json</div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-rule pt-3 sm:grid-cols-[12rem_1fr]">
          {EVENT_FIELDS.map(([field, meaning]) => (
            <div key={field} className="contents">
              <dt className="mono text-xs text-ink">{field}</dt>
              <dd className="mb-2 text-sm text-ink-2 sm:mb-0">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 border-t border-rule pt-10">
        <h2 className="label mb-4">Method</h2>
        <ol className="space-y-3">
          {METHOD_STEPS.map((step, i) => (
            <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm leading-relaxed text-ink-2">
              <span className="mono text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 border-t border-rule pt-10">
        <h2 className="label mb-4">Sources</h2>
        <div className="border-t border-rule-2">
          {meta.sources.map((s) => (
            <div key={s.file} className="border-b border-rule-2 px-2 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={s.url} target="_blank" rel="noreferrer" className="mono text-sm text-ink hover:text-signal">
                  {s.file} ↗
                </a>
                <span className="mono text-xs text-ink-3">
                  as on {fmtDate(s.asOn)} · {s.aircraft} aircraft · {s.operators} operators
                </span>
              </div>
              {s.sha256 && <div className="mono mt-1 break-all text-[11px] text-ink-3">sha256 {s.sha256}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-rule pt-10">
        <h2 className="label mb-4">Coverage and limits</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-2">
          This covers scheduled and non-scheduled operator permits only: no privately owned aircraft, flying training
          fleets, or state government aircraft. DGCA has not published a full register extract since 2019, so this
          index is built from operator permit lists instead, cross-checked against Wayback Machine captures where an
          exact date is needed.
        </p>
      </section>

      <section className="mt-10 border-t border-rule pt-10 pb-4">
        <h2 className="label mb-4">Licences</h2>
        <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-ink-2">
          <p>
            Source material is © Directorate General of Civil Aviation, reproduced with acknowledgement under the
            DGCA website policy.
          </p>
          <p>
            The compiled dataset is released under CC BY 4.0. Suggested citation: &ldquo;vtaircrafts.in, from DGCA
            operator lists&rdquo;. Code is MIT licensed. Photographs keep their individual Creative Commons licences
            and photographer credits, shown with every image.
          </p>
          <p>This is an independent, unofficial index. It is not the Indian civil aircraft register and must not be used for operational or legal purposes.</p>
        </div>
      </section>
    </main>
  );
}
