import type { Category, SnapshotInfo } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const FLOOR_YEAR = 2019;
const GAP_MONTHS = 12;

function buildTimeMs(): number {
  return Date.now();
}

interface Gap {
  list: Category;
  from: string;
  to: string;
}

function computeGaps(sorted: SnapshotInfo[]): Gap[] {
  const byList = new Map<Category, SnapshotInfo[]>();
  for (const s of sorted) {
    if (!byList.has(s.list)) byList.set(s.list, []);
    byList.get(s.list)!.push(s);
  }
  const gaps: Gap[] = [];
  for (const [list, arr] of byList) {
    for (let i = 1; i < arr.length; i++) {
      const months = (Date.parse(arr[i].date) - Date.parse(arr[i - 1].date)) / (30.44 * 86400000);
      if (months > GAP_MONTHS) gaps.push({ list, from: arr[i - 1].date, to: arr[i].date });
    }
  }
  return gaps;
}

/** One tick per DGCA list snapshot on a year axis, with uncovered stretches shaded. */
export function SnapshotChain({ snapshots }: { snapshots: SnapshotInfo[] }) {
  if (snapshots.length === 0) return <p className="card px-6 py-8 text-center text-fg-3">No snapshots recorded yet.</p>;

  const sorted = [...snapshots].sort((x, y) => x.date.localeCompare(y.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const gaps = computeGaps(sorted);

  const floor = Date.UTC(FLOOR_YEAR, 0, 1);
  const earliest = Math.min(floor, Date.parse(first.date));
  const today = buildTimeMs();
  const latest = Math.max(today, Date.parse(last.date));

  const W = 1000;
  const H = 84;
  const AXIS = 40;
  const TICK = 12;
  const PAD = 16;
  const x = (t: number) => PAD + ((t - earliest) / (latest - earliest)) * (W - PAD * 2);

  const startYear = new Date(earliest).getUTCFullYear();
  const endYear = new Date(latest).getUTCFullYear();
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const t = Date.UTC(y, 0, 1);
    if (t >= earliest && t <= latest) years.push(y);
  }
  const yearEvery = years.length > 12 ? 2 : 1;

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h3">Snapshots</h2>
        <span className="num text-[14px] text-fg-3">{fmtDate(first.date)} to {fmtDate(last.date)}</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label="DGCA snapshot timeline">
          {years.map((y, i) => {
            const t = Date.UTC(y, 0, 1);
            return (
              <g key={y}>
                <line x1={x(t)} y1={6} x2={x(t)} y2={H - 20} stroke="var(--line)" strokeWidth={1} />
                {i % yearEvery === 0 && (
                  <text x={x(t)} y={H - 4} textAnchor="middle" fontFamily="var(--font-sans)" fontSize={13} fill="var(--fg-3)">
                    {y}
                  </text>
                )}
              </g>
            );
          })}

          {gaps.map((g, i) => {
            const gx1 = x(Date.parse(g.from));
            const gx2 = x(Date.parse(g.to));
            const gy = g.list === "scheduled" ? AXIS - 24 : AXIS + 2;
            return (
              <rect key={`gap-${i}`} x={gx1} y={gy} width={Math.max(1, gx2 - gx1)} height={22} rx={3} fill="var(--danger)" opacity={0.18}>
                <title>{`${g.list}: no archived capture between ${fmtDate(g.from)} and ${fmtDate(g.to)}`}</title>
              </rect>
            );
          })}

          <line x1={PAD} y1={AXIS} x2={W - PAD} y2={AXIS} stroke="var(--line-2)" strokeWidth={1} />

          {sorted.map((s, i) => {
            const cx = x(Date.parse(s.date));
            const scheduled = s.list === "scheduled";
            const cy = scheduled ? AXIS - TICK : AXIS + TICK;
            const color = scheduled ? "var(--fg)" : "var(--teal)";
            return (
              <g key={`${s.date}-${s.list}-${i}`}>
                <line x1={cx} y1={AXIS} x2={cx} y2={cy} stroke={color} strokeWidth={1} opacity={0.5} />
                <circle cx={cx} cy={cy} r={3} fill={color}>
                  <title>{`${fmtDate(s.date)} · ${s.list} · ${s.aircraft} aircraft, ${s.operators} operators`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-3">
        <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fg" />Scheduled list</li>
        <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-teal" />Non-scheduled list</li>
        <li className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-danger/30" />No archived capture</li>
      </ul>
    </div>
  );
}
