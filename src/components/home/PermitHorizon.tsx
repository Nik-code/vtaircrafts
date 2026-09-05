import Link from "next/link";
import { Callout } from "./Callout";
import { fmtDate, fmtInt } from "@/lib/format";
import type { Expiry } from "./derive";

const VW = 1000;
const LANE = 9;       // vertical step between stacked markers
const MARK_H = 7;
const MIN_GAP = 7.5;  // markers closer than this stack instead of overlapping
const HEAD = 12;      // clearance above the tallest stack
const FOOT = 20;      // room for the month scale below the axis
const MONTH = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A 30-month strip of the operator permits falling due, one tick per month and
 * one mark per permit. Marks that would collide climb into the next lane.
 */
export function PermitHorizon({ start, months, expiries }: { start: number; months: number; expiries: Expiry[] }) {
  if (expiries.length < 3) return <ExpiryList expiries={expiries} />;

  const startDate = new Date(start);
  const y0 = startDate.getUTCFullYear();
  const m0 = startDate.getUTCMonth();
  const end = Date.UTC(y0, m0 + months, 1);
  const span = end - start;
  const x = (t: number) => Math.round((((t - start) / span) * VW) * 10) / 10;

  const lanes: number[] = [];
  const marks = expiries.map((e) => {
    const px = x(Date.parse(`${e.date}T00:00:00Z`));
    let lane = lanes.findIndex((last) => px - last >= MIN_GAP);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = px;
    return { e, px, lane };
  });
  const axis = lanes.length * LANE + HEAD;
  const height = axis + FOOT;

  const ticks = Array.from({ length: months + 1 }, (_, i) => {
    const t = Date.UTC(y0, m0 + i, 1);
    const month = (m0 + i) % 12;
    return { px: x(t), major: month === 0, label: month === 0 ? String(y0 + Math.floor((m0 + i) / 12)) : MONTH[month] };
  });

  return (
    <>
      <Callout>
        {fmtInt(expiries.length)} permits fall due in the next {months} months
      </Callout>

      <div className="mt-6 overflow-x-auto">
        <div className="mono min-w-[640px]">
          <svg viewBox={`0 0 ${VW} ${height}`} width="100%" className="block" role="img" aria-label={`Timeline of ${expiries.length} operator permit expiries over the next ${months} months`}>
            <line x1="0" y1={axis} x2={VW} y2={axis} stroke="var(--ink)" strokeWidth="1" />
            <line x1="0" y1="1" x2={VW} y2="1" stroke="var(--rule)" strokeWidth="0.8" strokeDasharray="2 6" />
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={t.px} y1={axis} x2={t.px} y2={axis + (t.major ? 8 : 4)} stroke={t.major ? "var(--ink)" : "var(--rule-2)"} strokeWidth={t.major ? 1 : 0.8} />
                {(t.major || i % 3 === 0) && i < months && (
                  <text
                    x={t.px + 2}
                    y={axis + 17}
                    fontSize="9"
                    letterSpacing="1"
                    fill={t.major ? "var(--ink)" : "var(--ink-3)"}
                  >
                    {t.label.toUpperCase()}
                  </text>
                )}
              </g>
            ))}
            {marks.map((m) => (
              <rect
                key={m.e.id}
                x={round1(m.px - 0.7)}
                y={axis - (m.lane + 1) * LANE}
                width="1.6"
                height={MARK_H}
                fill={m.e.scheduled ? "var(--ink)" : "var(--mint)"}
              >
                <title>{`${m.e.name} · ${fmtDate(m.e.date)}`}</title>
              </rect>
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <span className="label flex items-center gap-2"><span className="h-3 w-[3px] bg-ink" />Scheduled</span>
          <span className="label flex items-center gap-2"><span className="h-3 w-[3px] bg-mint" />Non-scheduled</span>
        </div>
        <p className="mono text-[11.5px] text-ink-3">Permit validity as printed on the DGCA list</p>
      </div>

      <ul className="mt-6 grid gap-x-8 gap-y-1 border-t border-rule pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {expiries.slice(0, 6).map((e) => (
          <li key={e.id} className="row-hover flex items-baseline justify-between gap-3 px-1 py-1">
            <Link href={`/operators/${e.id}`} className="truncate text-[14px] transition-colors duration-150 hover:text-signal">{e.name}</Link>
            <span className="mono shrink-0 text-[11.5px] text-ink-2">{fmtDate(e.date)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ExpiryList({ expiries }: { expiries: Expiry[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {expiries.map((e) => (
        <li key={e.id} className="row-hover flex items-baseline justify-between gap-4 px-2 py-2.5">
          <Link href={`/operators/${e.id}`} className="text-[15px] transition-colors duration-150 hover:text-signal">{e.name}</Link>
          <span className="mono text-sm text-ink-2">{fmtDate(e.date)}</span>
        </li>
      ))}
    </ul>
  );
}
