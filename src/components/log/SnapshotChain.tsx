import type { SnapshotInfo } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const FLOOR_YEAR = 2019;

/** Isolated so the render body below has no direct impure call: this runs once at build time for a static page. */
function buildTimeMs(): number {
  return Date.now();
}

/** A horizontal time axis with one tick per DGCA list snapshot, month-gridded, year to today. */
export function SnapshotChain({ snapshots }: { snapshots: SnapshotInfo[] }) {
  if (snapshots.length === 0) {
    return <div className="label border border-rule-2 bg-paper-2/40 px-4 py-6 text-center text-ink-3">No snapshots recorded yet.</div>;
  }

  const sorted = [...snapshots].sort((x, y) => x.date.localeCompare(y.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const floor = Date.UTC(FLOOR_YEAR, 0, 1);
  const earliest = Math.min(floor, Date.parse(first.date));
  const today = buildTimeMs();
  const latest = Math.max(today, Date.parse(last.date));

  const W = 1000;
  const H = 68;
  const AXIS = 34;
  const PAD = 14;
  const x = (t: number) => PAD + ((t - earliest) / (latest - earliest)) * (W - PAD * 2);

  const startYear = new Date(earliest).getUTCFullYear();
  const endYear = new Date(latest).getUTCFullYear();
  const months: { t: number; jan: boolean; year: number }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      const t = Date.UTC(y, m, 1);
      if (t < earliest || t > latest) continue;
      months.push({ t, jan: m === 0, year: y });
    }
  }

  return (
    <div className="border border-rule-2 bg-paper-2/40 p-4 sm:p-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="DGCA snapshot timeline">
        {months.map((m) => {
          const gx = x(m.t);
          return (
            <g key={m.t}>
              <line x1={gx} y1={m.jan ? 6 : 16} x2={gx} y2={m.jan ? H - 14 : H - 20} stroke="var(--rule)" strokeWidth={1} />
              {m.jan && (
                <text x={gx} y={H - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="var(--ink-3)">
                  {m.year}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD} y1={AXIS} x2={W - PAD} y2={AXIS} stroke="var(--rule-2)" strokeWidth={1} />
        {sorted.map((s, i) => {
          const cx = x(Date.parse(s.date));
          const scheduled = s.list === "scheduled";
          const cy = scheduled ? AXIS - 12 : AXIS + 12;
          const color = scheduled ? "var(--ink)" : "var(--mint)";
          return (
            <g key={`${s.date}-${s.list}-${i}`}>
              <line x1={cx} y1={AXIS} x2={cx} y2={cy} stroke={color} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={3} fill={color}>
                <title>{`${fmtDate(s.date)} · ${s.list} · ${s.aircraft} aircraft, ${s.operators} operators`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="mono mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
        <span>{fmtDate(first.date)}</span>
        <span className="label">
          <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 bg-ink" />scheduled</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 bg-mint" />non-scheduled</span>
        </span>
        <span>{fmtDate(last.date)}</span>
      </div>
    </div>
  );
}
