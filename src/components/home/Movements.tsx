import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Stamp, type StampTone } from "@/components/ui/Stamp";
import { fmtDate } from "@/lib/format";
import type { Event } from "@/lib/types";

const TONE: Record<string, StampTone> = {
  added: "signal",
  registered: "signal",
  removed: "caution",
  deregistered: "caution",
  moved: "ink",
};

/** "on 08 Jan 2019" when the source states a date, otherwise the interval. */
function when(e: Event) {
  if (e.date) return `on ${fmtDate(e.date)}`;
  if (e.from && e.to) return `between ${fmtDate(e.from)} and ${fmtDate(e.to)}`;
  if (e.to) return `by ${fmtDate(e.to)}`;
  return "date not stated";
}

function operatorCell(e: Event) {
  if (e.kind === "moved" && e.fromOperator && e.toOperator) {
    return (
      <>
        {e.fromOperatorId ? <Link href={`/operators/${e.fromOperatorId}`} className="hover:text-signal">{e.fromOperator}</Link> : e.fromOperator}
        <span className="text-ink-3">{" → "}</span>
        {e.toOperatorId ? <Link href={`/operators/${e.toOperatorId}`} className="hover:text-signal">{e.toOperator}</Link> : e.toOperator}
      </>
    );
  }
  if (!e.operator) return null;
  return e.operatorId ? <Link href={`/operators/${e.operatorId}`} className="hover:text-signal">{e.operator}</Link> : e.operator;
}

export function Movements({ events }: { events: Event[] }) {
  return (
    <>
      <ul className="divide-y divide-rule border-y border-rule">
        {events.map((e) => (
          <li key={e.id} className="row-hover px-2 py-3">
            <div className="grid gap-x-5 gap-y-1.5 lg:grid-cols-[minmax(0,296px)_auto_minmax(0,1fr)] lg:items-baseline">
              <span className="mono text-[11.5px] whitespace-nowrap text-ink-3">{when(e)}</span>
              <span className="flex items-center gap-3">
                <Stamp tone={TONE[e.kind] ?? "ink"}>{e.kind}</Stamp>
                {e.reg && (
                  <Link href={`/aircraft/${e.reg}`} className="display text-lg leading-none transition-colors duration-150 hover:text-signal">
                    {e.reg}
                  </Link>
                )}
              </span>
              <span className="text-[14px] leading-snug text-ink-2">
                {e.type ?? e.model}
                <span className="text-ink-3">{" · "}</span>
                {operatorCell(e)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="mono text-[11.5px] text-ink-3">
          Movements are read between snapshots, so an interval is given where the list does not state a date.
        </p>
        <ButtonLink href="/log">Full log</ButtonLink>
      </div>
    </>
  );
}
