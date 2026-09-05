import Link from "next/link";
import type { Event } from "@/lib/types";
import type { Expiry } from "./derive";
import { eventLabel, eventTone } from "@/components/log/eventFormat";
import { Stamp, type StampTone } from "@/components/ui/Stamp";
import { ButtonLink } from "@/components/ui/Button";
import { fmtDate } from "@/lib/format";
import { monthIndex, parseDay } from "./reel/timelineScale";
import { StripBay } from "./reel/StripBay";
import "./reel/stripbay.module.css";

const PERMIT_LIMIT = 40;

const TONE_COLOR: Record<StampTone, string> = {
  ink: "var(--ink)",
  signal: "var(--signal)",
  mint: "var(--mint)",
  caution: "var(--caution)",
  dim: "var(--ink-3)",
  light: "var(--paper)",
};

interface MovementDate {
  text: string;
  title?: string;
  ts: number;
}

/** Exact date when `date` is set; otherwise "by <the interval's end>", with a tooltip spelling out the interval. */
function movementDate(e: Event): MovementDate {
  if (e.date) return { text: fmtDate(e.date), ts: parseDay(e.date) };
  const to = e.to ?? e.from ?? null;
  if (!to) return { text: "—", ts: 0 };
  const ts = parseDay(to);
  if (e.from && e.to) {
    return { text: `by ${fmtDate(e.to)}`, title: `between ${fmtDate(e.from)} and ${fmtDate(e.to)}`, ts };
  }
  return { text: `by ${fmtDate(to)}`, ts };
}

/** Second line of a movement strip: type + operator, or a from → to transfer for a moved aircraft. */
function movementLine2(e: Event) {
  if (e.kind === "moved") return `${e.fromOperator ?? "Unknown"} → ${e.toOperator ?? "unknown"}`;
  const parts = [e.type ?? e.model ?? "", e.operator ?? e.toOperator ?? e.fromOperator ?? ""].filter(Boolean);
  return parts.join(" · ");
}

/** Months between the first day after the snapshot and an expiry date, for the "in N months" mono note. */
function monthsAway(dateIso: string, horizonStart: number) {
  const months = monthIndex(parseDay(dateIso)) - monthIndex(horizonStart);
  if (months <= 0) return "due this month";
  return `in ${months} month${months === 1 ? "" : "s"}`;
}

function MovementCard({ e }: { e: Event }) {
  if (!e.reg) return null;
  const tone = eventTone(e.kind);
  const { text, title } = movementDate(e);
  return (
    <Link href={`/aircraft/${e.reg}`} className="sb-card" style={{ borderLeftColor: TONE_COLOR[tone] }}>
      <div className="sb-line">
        <span className="stencil text-[16px]">{e.reg}</span>
        <Stamp tone={tone} className="shrink-0">
          {eventLabel(e.kind)}
        </Stamp>
      </div>
      <p className="sb-sub">{movementLine2(e)}</p>
      <p className="label" title={title}>
        {text}
      </p>
    </Link>
  );
}

function PermitCard({ e, horizonStart }: { e: Expiry; horizonStart: number }) {
  const tone: StampTone = e.scheduled ? "ink" : "mint";
  return (
    <Link href={`/operators/${e.id}`} className="sb-card" style={{ borderLeftColor: TONE_COLOR[tone] }}>
      <div className="sb-line-top">
        <span className="text-[14px] leading-snug">{e.name}</span>
        <Stamp tone={tone} className="shrink-0">
          {e.scheduled ? "SCH" : "NSOP"}
        </Stamp>
      </div>
      <p className="sb-sub">Permit due</p>
      <div className="sb-line">
        <span className="label">{fmtDate(e.date)}</span>
        <span className="sb-note">{monthsAway(e.date, horizonStart)}</span>
      </div>
    </Link>
  );
}

/**
 * Permit horizon and recent movements drawn as two ATC flight-progress strip
 * bays instead of a shared time axis: the source data clusters hard (dozens
 * of permits due in the same weeks, dozens of movements dated "by" the same
 * list date), so a proportional axis piles labels on top of each other. A
 * strip bay just lists them, newest/soonest first, each on its own card.
 *
 * Each bay auto-scrolls via `reel/marquee.module.css` (paused on hover/focus,
 * a plain scrollable strip under reduced motion); the upper bay scrolls left,
 * the lower one right (`StripBay`'s `reverse`), both slowly.
 */
export function HomeTimeline({
  events,
  expiries,
  horizonStart,
  horizonMonths,
}: {
  events: Event[];
  expiries: Expiry[];
  horizonStart: number;
  horizonMonths: number;
}) {
  const movements = events
    .filter((e) => e.reg)
    .map((e) => ({ e, info: movementDate(e) }))
    .sort((a, b) => b.info.ts - a.info.ts);

  const shownExpiries = expiries.slice(0, PERMIT_LIMIT);
  const overflow = expiries.length > PERMIT_LIMIT;

  const movementCards = (
    <>
      {movements.map(({ e }) => (
        <MovementCard key={e.id} e={e} />
      ))}
    </>
  );

  const permitCards = (
    <>
      {shownExpiries.map((e) => (
        <PermitCard key={e.id} e={e} horizonStart={horizonStart} />
      ))}
      {overflow && (
        <div className="sb-card sb-ghost">
          <ButtonLink href="/operators" tone="ghost">
            All operators →
          </ButtonLink>
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="border-y border-ink">
        <StripBay label="Movements · newest first" duration="220s" cards={movementCards} />
        <div className="border-t border-rule" />
        <StripBay
          label={`Permits due · next ${horizonMonths} months`}
          duration="220s"
          reverse
          cards={permitCards}
        />
      </div>
      <p className="label mt-3 text-ink-3">
        Permits falling due in the next {horizonMonths} months and the newest movements between DGCA lists
      </p>
    </div>
  );
}
