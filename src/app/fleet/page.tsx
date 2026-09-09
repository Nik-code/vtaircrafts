import type { Metadata } from "next";
import { Suspense } from "react";
import { getIndex, getMeta } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { FleetExplorer } from "@/components/fleet/FleetExplorer";
import { Container, PageHeader } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Fleet",
  description: "Search and filter every aircraft on an Indian scheduled or non-scheduled operator permit.",
};

export default function FleetPage() {
  const total = getIndex().length;
  const meta = getMeta();
  return (
    <main className="py-10 sm:py-14">
      <Container wide>
        <PageHeader
          eyebrow={`${fmtInt(total)} aircraft · as on ${fmtDate(meta.snapshot)}`}
          title="Fleet"
          lede="Every aircraft on the DGCA scheduled and non-scheduled operator lists. Filters live in the address bar, so a view can be shared."
        />
      </Container>
      <div className="mt-10">
        <Suspense fallback={<Container wide><p className="text-fg-3">Loading the index…</p></Container>}>
          <FleetExplorer total={total} />
        </Suspense>
      </div>
    </main>
  );
}
