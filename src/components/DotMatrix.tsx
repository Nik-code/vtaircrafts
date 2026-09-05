/**
 * Dot-matrix bar chart: one column per item, dots lit from the bottom.
 * Pure SVG so it stays crisp and needs no client JS.
 */
export interface DotMatrixItem {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}

export function DotMatrix({
  items,
  rows = 22,
  dot = 6,
  gap = 4,
  showValues = true,
}: {
  items: DotMatrixItem[];
  rows?: number;
  dot?: number;
  gap?: number;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const step = dot + gap;
  const cols = items.length;
  const w = cols * step - gap;
  const h = rows * step - gap;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" preserveAspectRatio="none" style={{ maxHeight: 260 }}>
        {items.map((it, ci) => {
          const lit = Math.max(it.value > 0 ? 1 : 0, Math.round((it.value / max) * rows));
          return Array.from({ length: rows }).map((_, ri) => {
            const on = ri >= rows - lit;
            return (
              <rect
                key={`${ci}-${ri}`}
                x={ci * step}
                y={ri * step}
                width={dot}
                height={dot}
                rx={1}
                fill={on ? (it.accent ? "var(--teal)" : "var(--accent)") : "var(--grid-dot)"}
                opacity={on ? 0.92 - (rows - 1 - ri) * 0.012 : 1}
              />
            );
          });
        })}
      </svg>
      <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <div key={it.label} className="min-w-0 px-0.5 text-center">
            {showValues && <div className="mono text-[11px] text-fg">{it.value}</div>}
            <div className="label truncate text-[9px] tracking-[0.08em]" title={it.label}>
              {it.href ? <a href={it.href} className="hover:text-fg">{it.label}</a> : it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
