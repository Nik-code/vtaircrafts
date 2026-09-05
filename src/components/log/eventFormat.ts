import type { Event, EventKind } from "@/lib/types";
import type { StampTone } from "@/components/ui/Stamp";

/** Local kind used for the synthetic "first seen" anchor entry on the aircraft timeline. */
export type TimelineKind = EventKind | "first-seen";

/** Stamp tone per event kind, per DESIGN.md: signal for arrivals, caution for departures, ink for transfers. */
export function eventTone(kind: TimelineKind): StampTone {
  if (kind === "registered" || kind === "added") return "signal";
  if (kind === "deregistered" || kind === "removed") return "caution";
  if (kind === "moved" || kind === "owner-change") return "ink";
  if (kind === "snapshot") return "dim";
  return "dim"; // first-seen
}

export function eventLabel(kind: TimelineKind): string {
  if (kind === "first-seen") return "First seen";
  return kind.replace("-", " ");
}

/** One sentence of prose describing an event, sentence case, no trailing surprises. */
export function eventProse(e: Event): string {
  switch (e.kind) {
    case "added":
      return `Added to ${e.operator ?? "an operator"}'s ${e.list ?? "DGCA"} list.`;
    case "removed":
      return `Removed from ${e.operator ?? "an operator"}'s ${e.list ?? "DGCA"} list.`;
    case "moved":
      return `Moved from ${e.fromOperator ?? "an unknown operator"} to ${e.toOperator ?? "an unknown operator"}.`;
    case "registered": {
      const who = e.owner ?? e.operator;
      const head = who ? `Registered to ${who}` : "Registered";
      return e.msn ? `${head}, MSN ${e.msn}.` : `${head}.`;
    }
    case "deregistered":
      return e.operator ? `Deregistered, was with ${e.operator}.` : "Deregistered.";
    case "owner-change": {
      const who = e.owner ?? "a new owner";
      return e.lessor ? `Ownership transferred to ${who}, leased from ${e.lessor}.` : `Ownership transferred to ${who}.`;
    }
    case "snapshot":
      return e.note ?? "Snapshot recorded.";
    default:
      return "";
  }
}
