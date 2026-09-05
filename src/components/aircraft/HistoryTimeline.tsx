import type { Aircraft, Event } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Stamp } from "@/components/ui/Stamp";
import { eventLabel, eventProse, eventTone, type TimelineKind } from "@/components/log/eventFormat";

interface Row {
  key: string;
  kind: TimelineKind;
  date: string | null;
  from: string | null;
  to: string | null;
  prose: string;
}

function DateLine({ date, from, to }: { date: string | null; from: string | null; to: string | null }) {
  if (date) return <span className="mono text-sm">{fmtDate(date)}</span>;
  if (from || to) {
    return <span className="mono text-sm">between {fmtDate(from)} and {fmtDate(to)}</span>;
  }
  return <span className="mono text-sm text-ink-3">date unknown</span>;
}

/** Vertical timeline of everything recorded for one registration, newest first, first-seen pinned last. */
export function HistoryTimeline({ aircraft, events }: { aircraft: Aircraft; events: Event[] }) {
  const own = events.filter((e) => e.reg === aircraft.reg);
  const hasExplicitRegistered = own.some((e) => e.kind === "registered");

  const rows: Row[] = own.map((e) => ({
    key: e.id,
    kind: e.kind,
    date: e.date,
    from: e.from,
    to: e.to,
    prose: eventProse(e),
  }));

  // Synthesise a "registered" entry from aircraft.history when the richer events feed hasn't arrived yet.
  if (!hasExplicitRegistered && aircraft.history?.registeredOn) {
    rows.push({
      key: `registered|${aircraft.reg}|${aircraft.history.registeredOn}`,
      kind: "registered",
      date: aircraft.history.registeredOn,
      from: null,
      to: null,
      prose: eventProse({
        id: "synthetic",
        kind: "registered",
        reg: aircraft.reg,
        date: aircraft.history.registeredOn,
        from: null,
        to: null,
        list: null,
        owner: aircraft.history.owner ?? undefined,
        msn: aircraft.history.msn ?? undefined,
        source: { kind: "report", file: "", url: null },
      }),
    });
  }

  rows.sort((x, y) => (y.date ?? y.to ?? "").localeCompare(x.date ?? x.to ?? ""));

  const firstSeen = aircraft.history?.firstSnapshot ?? aircraft.firstSeen;
  rows.push({
    key: "first-seen",
    kind: "first-seen",
    date: firstSeen,
    from: null,
    to: null,
    prose: "First seen on a DGCA list.",
  });

  const hasHistory = rows.length > 1;

  return (
    <section className="mt-12">
      <h2 className="label mb-5">History</h2>
      {!hasHistory && (
        <p className="mb-4 text-sm text-ink-2">No changes have been recorded for this registration since it was first seen.</p>
      )}
      <div className="relative pl-6">
        <div className="absolute bottom-1 left-[3px] top-1 w-px bg-rule-2" aria-hidden />
        <ol>
          {rows.map((r) => (
            <li key={r.key} className="relative pb-6 last:pb-0">
              <span
                className="absolute -left-[25px] top-[3px] h-[7px] w-[7px] rounded-full border border-ink bg-paper"
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-2">
                <DateLine date={r.date} from={r.from} to={r.to} />
                <Stamp tone={eventTone(r.kind)}>{eventLabel(r.kind)}</Stamp>
              </div>
              <p className="mt-1 max-w-xl text-sm text-ink-2">{r.prose}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
