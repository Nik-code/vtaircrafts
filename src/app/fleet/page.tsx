import type { Metadata } from "next";
import { Suspense } from "react";
import { getIndex, getMeta } from "@/lib/data";
import { FleetExplorer } from "@/components/FleetExplorer";

export const metadata: Metadata = { title: "Fleet", description: "Search and filter every aircraft on Indian operator permits." };

export default function FleetPage() {
  const index = getIndex();
  const meta = getMeta();
  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-2">Fleet explorer</div>
          <h1 className="display text-4xl sm:text-5xl">{index.length.toLocaleString("en-IN")} aircraft</h1>
        </div>
        <div className="mono text-xs text-fg-dim">snapshot {meta.snapshot} · press <kbd className="border border-line px-1">/</kbd> to search</div>
      </div>
      <Suspense fallback={<div className="label">loading…</div>}>
        <FleetExplorer data={index} />
      </Suspense>
    </main>
  );
}
