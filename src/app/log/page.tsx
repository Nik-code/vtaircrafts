import type { Metadata } from "next";
import { getChanges, getMeta } from "@/lib/data";
import { LogView, type LogEntry } from "@/components/LogView";

export const metadata: Metadata = { title: "Log", description: "Every change to the Indian operator fleet lists, snapshot by snapshot." };

export default function LogPage() {
  const meta = getMeta();
  const changes = getChanges();
  const entries: LogEntry[] = [];
  for (const s of meta.sources) {
    entries.push({ at: meta.snapshot, kind: "SNAPSHOT", text: `${s.file} · ${s.aircraft} registrations · ${s.operators} operators · DGCA "updated as on ${s.asOn}" · sha256 ${s.sha256?.slice(0, 12)}` });
  }
  if (changes) {
    for (const c of changes.added) entries.push({ at: changes.to, kind: "ADDED", reg: c.reg, text: `${c.type} · ${c.operator}`, href: `/aircraft/${c.reg}` });
    for (const c of changes.moved) entries.push({ at: changes.to, kind: "MOVED", reg: c.reg, text: `${c.from} → ${c.to} · ${c.model}`, href: `/aircraft/${c.reg}` });
    for (const c of changes.removed) entries.push({ at: changes.to, kind: "REMOVED", reg: c.reg, text: `${c.type} · was ${c.operator}` });
    entries.push({ at: changes.from, kind: "SNAPSHOT", text: `baseline · ${changes.scope.join(", ")} list(s) · ${changes.added.length} added, ${changes.removed.length} removed, ${changes.moved.length} moved by ${changes.to}` });
  }
  for (const i of meta.issues) entries.push({ at: meta.snapshot, kind: "NOTE", text: `${i.category}: ${i.message}` });

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="label mb-2">Change log</div>
      <h1 className="display mb-2 text-4xl sm:text-5xl">{entries.length.toLocaleString("en-IN")} events</h1>
      <p className="mb-8 max-w-2xl text-sm text-fg-muted">
        Diffs are computed between DGCA list snapshots. {changes ? <>The current baseline is the scheduled operators list of {changes.from}; non-scheduled history starts with the {meta.snapshot} snapshot.</> : null} Monthly snapshots accumulate here from now on.
      </p>
      <LogView entries={entries} />
    </main>
  );
}
