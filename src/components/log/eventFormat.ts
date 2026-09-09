import type { Event, EventKind } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/Badge";

/** Local kind used for the synthetic "first seen" anchor entry on the aircraft timeline. */
export type TimelineKind = EventKind | "first-seen";

/** Badge tone per event kind: accent for arrivals, danger for departures, neutral for the rest. */
export function eventTone(kind: TimelineKind): BadgeTone {
  if (kind === "registered" || kind === "added") return "accent";
  if (kind === "deregistered" || kind === "removed") return "danger";
  return "neutral";
}

export function eventLabel(kind: TimelineKind): string {
  if (kind === "first-seen") return "First seen";
  if (kind === "owner-change") return "Owner change";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
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
