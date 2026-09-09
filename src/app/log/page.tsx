import type { Metadata } from "next";
import { getEvents, getSnapshots } from "@/lib/data";
import { fmtInt } from "@/lib/format";
import type { EventKind } from "@/lib/types";
import { Container, PageHeader } from "@/components/ui/Container";
import { SnapshotChain } from "@/components/log/SnapshotChain";
import { LogTimeline } from "@/components/log/LogTimeline";

export const metadata: Metadata = {
  title: "Change log",
  description: "Every registration, deregistration, addition, removal and move recorded across DGCA list snapshots.",
};

const KINDS: EventKind[] = ["registered", "added", "moved", "removed", "deregistered", "owner-change", "snapshot"];

export default function LogPage() {
  const events = getEvents();
  const snapshots = getSnapshots();

  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<EventKind, number>;
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  return (
    <main className="py-10 sm:py-14">
      <Container>
        <PageHeader
          eyebrow={`${fmtInt(events.length)} events · ${fmtInt(snapshots.length)} snapshots`}
          title="Change log"
          lede="Everything that changed between DGCA list snapshots since 2005. Exact dates come from DGCA registration reports; other changes are bracketed between two snapshots."
        />
        <section className="mt-12">
          <SnapshotChain snapshots={snapshots} />
        </section>
        <section className="mt-12">
          <LogTimeline counts={counts} />
        </section>
      </Container>
    </main>
  );
}
