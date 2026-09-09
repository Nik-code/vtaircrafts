import type { Aircraft, Event } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/Container";
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
  if (date) return <span className="num text-[15px] text-fg">{fmtDate(date)}</span>;
  if (from || to) return <span className="num text-[15px] text-fg-2">Between {fmtDate(from)} and {fmtDate(to)}</span>;
  return <span className="text-[15px] text-fg-3">Date unknown</span>;
}

/** Everything recorded for one registration, newest first, first-seen pinned last. */
export function HistoryTimeline({ aircraft, events }: { aircraft: Aircraft; events: Event[] }) {
  const own = events.filter((e) => e.reg === aircraft.reg);
  const hasExplicitRegistered = own.some((e) => e.kind === "registered");

  const rows: Row[] = own.map((e) => ({ key: e.id, kind: e.kind, date: e.date, from: e.from, to: e.to, prose: eventProse(e) }));

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
  rows.push({ key: "first-seen", kind: "first-seen", date: firstSeen, from: null, to: null, prose: "First seen on a DGCA list." });

  return (
    <section className="mt-16">
      <SectionHeader title="History" meta={rows.length > 1 ? `${rows.length} entries` : undefined} />
      {rows.length === 1 && <p className="mb-5 text-fg-2">No changes have been recorded for this registration since it was first seen.</p>}
      <ol className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <DateLine date={r.date} from={r.from} to={r.to} />
              <Badge tone={eventTone(r.kind)}>{eventLabel(r.kind)}</Badge>
            </div>
            <p className="text-[15px] text-fg-2">{r.prose}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
