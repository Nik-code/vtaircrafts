import type { Metadata } from "next";
import { getMeta } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Data & methodology", description: "Download the dataset and read how it is built." };

const FILES = [
  { name: "aircraft.json", desc: "Full records: registration, hex, operator, type, seats, permit, image credit, source." },
  { name: "aircraft.csv", desc: "Flat CSV of the same records for spreadsheets." },
  { name: "operators.json", desc: "Operator summaries with type mix and permit validity." },
  { name: "changes.json", desc: "Added, removed and moved registrations versus the previous snapshot." },
  { name: "meta.json", desc: "Snapshot metadata, source hashes, counts and parser notes." },
];

export default function DataPage() {
  const meta = getMeta();
  return (
    <main className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8">
      <div className="label mb-2">Data</div>
      <h1 className="display mb-8 text-4xl sm:text-5xl">Download & methodology</h1>

      <section className="mb-10">
        <h2 className="label mb-3">Files · snapshot {meta.snapshot}</h2>
        <div className="frame hairline divide-y divide-line bg-bg-elev">
          {FILES.map((f) => (
            <a key={f.name} href={`/data/latest/${f.name}`} download className="grid gap-1 px-4 py-3 hover:bg-bg-panel sm:grid-cols-[14rem_1fr]">
              <span className="mono text-sm text-fg">{f.name}</span>
              <span className="text-sm text-fg-muted">{f.desc}</span>
            </a>
          ))}
        </div>
        <p className="mono mt-2 text-xs text-fg-dim">Stable URL: /data/latest/&lt;file&gt;. Earlier snapshots live in the GitHub repository under data/snapshots.</p>
      </section>

      <section className="mb-10 space-y-3 text-[15px] leading-relaxed text-fg-muted">
        <h2 className="label">How it is built</h2>
        <p>The DGCA publishes two PDFs listing every aircraft on a scheduled or non-scheduled operator permit. They are spreadsheets printed to PDF, so this site extracts word positions with poppler, rebuilds the columns from the header row, strips the first operator&apos;s header that the export stamps on every page, and re-joins registrations the renderer split across lines.</p>
        <p>Every parsed model group is checked against the count DGCA prints next to it. Mismatches are recorded, never silently fixed. Each month the pipeline downloads both PDFs, keeps the originals with their hashes, and publishes a new snapshot plus a diff.</p>
        <p>ICAO 24-bit addresses and type designators come from the readsb aircraft database maintained by Mictronics and distributed with tar1090. Photographs are chosen from Wikimedia Commons categories per registration; where a tail has no photo, a clearly labelled photo of the same type at the same operator, or the same type at another Indian operator, is shown instead.</p>
        <p>What is not here: privately owned aircraft, flying training fleets, state government aircraft and anything else without an operator permit. DGCA has not published a full register extract since 2019.</p>
      </section>

      <section className="mb-10">
        <h2 className="label mb-3">Sources</h2>
        <div className="frame hairline divide-y divide-line bg-bg-elev">
          {meta.sources.map((s) => (
            <div key={s.file} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={s.url} className="mono text-sm text-fg hover:text-accent" target="_blank" rel="noreferrer">{s.file} ↗</a>
                <span className="mono text-xs text-fg-dim">as on {fmtDate(s.asOn)} · {s.aircraft} aircraft · {s.operators} operators</span>
              </div>
              <div className="mono mt-1 break-all text-[11px] text-fg-dim">sha256 {s.sha256}</div>
            </div>
          ))}
        </div>
      </section>

      {meta.issues.length > 0 && (
        <section className="mb-10">
          <h2 className="label mb-3">Known inconsistencies in the source · {meta.issues.length}</h2>
          <ul className="frame hairline divide-y divide-line bg-bg-elev">
            {meta.issues.map((i, n) => (
              <li key={n} className="mono px-4 py-2 text-xs text-fg-muted"><span className="text-fg-dim">{i.category}</span> · {i.message}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 text-[15px] leading-relaxed text-fg-muted">
        <h2 className="label">Licences</h2>
        <p>Source material © Directorate General of Civil Aviation, reproduced with acknowledgement under the DGCA website policy. The compiled dataset is released under CC BY 4.0; cite “vtaircrafts.in, from DGCA operator lists”. Code is MIT. Photographs keep their individual Creative Commons licences and photographer credits.</p>
        <p>This is an independent, unofficial index. It is not the Indian civil aircraft register and must not be used for operational or legal purposes.</p>
      </section>
    </main>
  );
}
