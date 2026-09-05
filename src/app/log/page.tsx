import type { Metadata } from "next";
import { getEvents, getSnapshots } from "@/lib/data";
import { fmtInt } from "@/lib/format";
import type { EventKind } from "@/lib/types";
import { TitleBlock } from "@/components/ui/TitleBlock";
import { SnapshotChain } from "@/components/log/SnapshotChain";
import { LogTimeline } from "@/components/log/LogTimeline";

export const metadata: Metadata = {
  title: "Log",
  description: "Every registration, deregistration, addition, removal and move recorded across DGCA list snapshots.",
};

const KINDS: EventKind[] = ["registered", "added", "moved", "removed", "deregistered", "owner-change", "snapshot"];

export default function LogPage() {
  // Read once server-side to derive small aggregates (a count, a length) — the
  // 6,260-event array itself is never serialised into this page's markup. The
  // full log is fetched client-side from /data/latest/events.json instead.
  const events = getEvents();
  const snapshots = getSnapshots();

  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<EventKind, number>;
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <TitleBlock
        sheet="05"
        title="Movement log"
        fields={[
          { label: "Events", value: fmtInt(events.length) },
          { label: "Snapshots", value: fmtInt(snapshots.length) },
        ]}
      />

      <section className="my-8">
        <SnapshotChain snapshots={snapshots} />
      </section>

      <LogTimeline counts={counts} />

      <p className="mx-auto mt-10 max-w-[960px] border-t border-rule pt-6 text-sm leading-relaxed text-ink-2">
        Diffs are computed between DGCA list snapshots, including Wayback Machine captures of the same pages. When a
        change is only bracketed between two snapshots, the interval shown is honest about it: the change happened
        somewhere inside that window. Exact dates are used where DGCA registration reports state one directly.
      </p>
    </main>
  );
}
