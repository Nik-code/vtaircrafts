import Link from "next/link";
import type { ReactNode } from "react";

const ITEMS: Array<{ label: string; body: ReactNode }> = [
  {
    label: "What this is",
    body: "Every aircraft on India's scheduled and non-scheduled operator permits, in one list.",
  },
  {
    label: "Where it comes from",
    body: (
      <>
        Two DGCA operator-list PDFs, redrawn each month. Method and sources on{" "}
        <Link href="/data" className="underline underline-offset-2 hover:text-ink">
          /data
        </Link>
        .
      </>
    ),
  },
  {
    label: "Scheduled vs non-scheduled",
    body: "The permit class an operator holds with DGCA, not the aircraft type.",
  },
  {
    label: "Seats, photos, snapshots",
    body: "Seats are the number DGCA prints. A representative photo is the same type and livery when the tail itself is not photographed. A snapshot is one dated copy of the lists.",
  },
];

/** Thin band under the hero threshold: what the site is, in a reader's own words. */
export function IntroStrip() {
  return (
    <div className="grid divide-y divide-rule border-b border-rule sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {ITEMS.map((item) => (
        <div key={item.label} className="px-4 py-5 sm:px-5 sm:py-6">
          <h2 className="label">{item.label}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
