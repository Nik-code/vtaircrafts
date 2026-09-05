import type { Metadata } from "next";
import { Suspense } from "react";
import { getIndex, getMeta } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { FleetExplorer } from "@/components/fleet/FleetExplorer";
import { TitleBlock } from "@/components/ui/TitleBlock";

export const metadata: Metadata = {
  title: "Fleet index",
  description: "Search and filter every aircraft on an Indian scheduled or non-scheduled operator permit.",
};

export default function FleetPage() {
  const total = getIndex().length;
  const meta = getMeta();
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <TitleBlock
        sheet="02"
        title="Fleet index"
        fields={[
          { label: "Rev", value: fmtDate(meta.snapshot) },
          { label: "Count", value: fmtInt(total) },
        ]}
      />
      <p className="mt-3 max-w-[62ch] text-sm text-ink-2">
        Every aircraft on the DGCA scheduled and non-scheduled operator lists. Tick the checklist to
        narrow the set; the address bar keeps your selection, so a filtered view can be shared.
      </p>
      <div className="mt-6">
        <Suspense fallback={<div className="label">Loading the checklist</div>}>
          <FleetExplorer total={total} />
        </Suspense>
      </div>
    </main>
  );
}
