import type { Aircraft } from "@/lib/types";

/** Stub: replaced by the home-timeline agent. */
export function PlateReel({ aircraft }: { aircraft: Aircraft[] }) {
  return <div className="label text-ink-3">Plates: {aircraft.length}</div>;
}
