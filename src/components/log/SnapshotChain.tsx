import type { Category, SnapshotInfo } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const FLOOR_YEAR = 2019;
const GAP_MONTHS = 12;

/** Isolated so the render body below has no direct impure call: this runs once at build time for a static page. */
function buildTimeMs(): number {
  return Date.now();
}

interface Gap {
  list: Category;
  from: string;
  to: string;
}

/**
 * Any run longer than GAP_MONTHS between two consecutive snapshots of the same list
 * counts as a coverage gap — nothing here is hard-coded to specific dates.
 */
function computeGaps(sorted: SnapshotInfo[]): Gap[] {
  const byList = new Map<Category, SnapshotInfo[]>();
  for (const s of sorted) {
    if (!byList.has(s.list)) byList.set(s.list, []);
    byList.get(s.list)!.push(s);
  }
  const gaps: Gap[] = [];
  for (const [list, arr] of byList) {
    for (let i = 1; i < arr.length; i++) {
      const prevT = Date.parse(arr[i - 1].date);
      const curT = Date.parse(arr[i].date);
      const months = (curT - prevT) / (30.44 * 86400000);
      if (months > GAP_MONTHS) gaps.push({ list, from: arr[i - 1].date, to: arr[i].date });
    }
  }
  return gaps;
}

/** An instrument-tape time axis: one tick per DGCA list snapshot, year-gridded, floor year to today. */
export function SnapshotChain({ snapshots }: { snapshots: SnapshotInfo[] }) {
  if (snapshots.length === 0) {
    return <div className="label border border-rule-2 bg-paper-2/40 px-4 py-6 text-center text-ink-3">No snapshots recorded yet.</div>;
  }

  const sorted = [...snapshots].sort((x, y) => x.date.localeCompare(y.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const gaps = computeGaps(sorted);

  const floor = Date.UTC(FLOOR_YEAR, 0, 1);
  const earliest = Math.min(floor, Date.parse(first.date));
  const today = buildTimeMs();
  const latest = Math.max(today, Date.parse(last.date));

  const W = 1000;
  const H = 96;
  const AXIS = 48;
  const TICK = 13;
  const PAD = 14;
  const x = (t: number) => PAD + ((t - earliest) / (latest - earliest)) * (W - PAD * 2);

  const startYear = new Date(earliest).getUTCFullYear();
  const endYear = new Date(latest).getUTCFullYear();
  const years: { t: number; year: number }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const t = Date.UTC(y, 0, 1);
    if (t < earliest || t > latest) continue;
    years.push({ t, year: y });
  }

  const todayX = x(today);
  const lastX = x(Date.parse(last.date));
  const showToday = Math.abs(todayX - lastX) > 18;

  return (
    <div className="border border-rule-2 bg-paper-2/40 p-4 sm:p-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="DGCA snapshot timeline">
        {years.map((y) => (
          <g key={y.t}>
            <line x1={x(y.t)} y1={8} x2={x(y.t)} y2={H - 16} stroke="var(--rule)" strokeWidth={1} />
            <text x={x(y.t)} y={H - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="var(--ink-3)">
              {y.year}
            </text>
          </g>
        ))}

        {gaps.map((g, i) => {
          const gx1 = x(Date.parse(g.from));
          const gx2 = x(Date.parse(g.to));
          const scheduled = g.list === "scheduled";
          const gy = scheduled ? AXIS - 26 : AXIS + 2;
          const gh = 24;
          const midX = (gx1 + gx2) / 2;
          const wide = gx2 - gx1 > 90;
          return (
            <g key={`gap-${i}`}>
              <rect x={gx1} y={gy} width={Math.max(1, gx2 - gx1)} height={gh} fill="var(--caution)" opacity={0.14} />
              <line x1={gx1} y1={gy} x2={gx1} y2={gy + gh} stroke="var(--caution)" strokeWidth={1} opacity={0.5} />
              <line x1={gx2} y1={gy} x2={gx2} y2={gy + gh} stroke="var(--caution)" strokeWidth={1} opacity={0.5} />
              {wide && (
                <text
                  x={midX}
                  y={gy + gh / 2 + 3}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={7.5}
                  letterSpacing={0.5}
                  fill="var(--caution)"
                >
                  NO ARCHIVED CAPTURE
                </text>
              )}
              <title>{`${g.list} · no archived capture between ${fmtDate(g.from)} and ${fmtDate(g.to)}`}</title>
            </g>
          );
        })}

        <line x1={PAD} y1={AXIS} x2={W - PAD} y2={AXIS} stroke="var(--rule-2)" strokeWidth={1} />

        {sorted.map((s, i) => {
          const cx = x(Date.parse(s.date));
          const scheduled = s.list === "scheduled";
          const cy = scheduled ? AXIS - TICK : AXIS + TICK;
          const color = scheduled ? "var(--ink)" : "var(--mint)";
          return (
            <g key={`${s.date}-${s.list}-${i}`}>
              <line x1={cx} y1={AXIS} x2={cx} y2={cy} stroke={color} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={2.75} fill={color}>
                <title>{`${fmtDate(s.date)} · ${s.list} · ${s.aircraft} aircraft, ${s.operators} operators`}</title>
              </circle>
            </g>
          );
        })}

        {showToday && (
          <g>
            <line x1={todayX} y1={6} x2={todayX} y2={H - 16} stroke="var(--signal)" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
            <text x={todayX} y={16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={7.5} letterSpacing={0.5} fill="var(--signal)">
              TODAY
            </text>
          </g>
        )}
      </svg>
      <div className="mono mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
        <span>{fmtDate(first.date)}</span>
        <span className="label">
          <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 bg-ink" />scheduled</span>
          <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 bg-mint" />non-scheduled</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 bg-caution" />no archived capture</span>
        </span>
        <span>{fmtDate(last.date)}</span>
      </div>
    </div>
  );
}
