import type { Metadata } from "next";
import { getEvents, getSnapshots } from "@/lib/data";
import { fmtInt } from "@/lib/format";
import { TitleBlock } from "@/components/ui/TitleBlock";
import { SnapshotChain } from "@/components/log/SnapshotChain";
import { LogTimeline } from "@/components/log/LogTimeline";

export const metadata: Metadata = {
  title: "Log",
  description: "Every registration, deregistration, addition, removal and move recorded across DGCA list snapshots.",
};

export default function LogPage() {
  const events = getEvents();
  const snapshots = getSnapshots();

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

      <LogTimeline events={events} />

      <p className="mt-10 max-w-2xl border-t border-rule pt-6 text-sm leading-relaxed text-ink-2">
        Diffs are computed between DGCA list snapshots, including Wayback Machine captures of the same pages. When a
        change is only bracketed between two snapshots, the interval shown is honest about it: the change happened
        somewhere inside that window. Exact dates are used where DGCA registration reports state one directly.
      </p>
    </main>
  );
}
