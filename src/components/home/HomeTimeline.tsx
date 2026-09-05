import type { Event } from "@/lib/types";
import type { Expiry } from "./derive";

/** Stub: replaced by the home-timeline agent. */
export function HomeTimeline({ events, expiries, horizonStart, horizonMonths }: { events: Event[]; expiries: Expiry[]; horizonStart: number; horizonMonths: number }) {
  return <div className="label text-ink-3">Timeline: {events.length} events, {expiries.length} expiries from {horizonStart} over {horizonMonths} months</div>;
}
