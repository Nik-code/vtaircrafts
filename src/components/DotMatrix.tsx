/**
 * Dot-matrix bar chart: one column per item, square dots lit from the bottom.
 * CSS grid so dots stay square at any width and need no client JS.
 */
export interface DotMatrixItem {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}

export function DotMatrix({
  items,
  rows = 20,
  showValues = true,
}: {
  items: DotMatrixItem[];
  rows?: number;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="w-full">
      <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it, ci) => {
          const lit = Math.max(it.value > 0 ? 1 : 0, Math.round((it.value / max) * rows));
          return (
            <div key={ci} className="flex flex-col items-center gap-[3px]">
              {Array.from({ length: rows }).map((_, ri) => {
                const on = ri >= rows - lit;
                return (
                  <span
                    key={ri}
                    className="block h-[7px] w-[7px] rounded-[1px] sm:h-2 sm:w-2"
                    style={{
                      background: on ? (it.accent ? "var(--teal)" : "var(--accent)") : "var(--grid-dot)",
                      opacity: on ? 0.95 - (rows - 1 - ri) * 0.015 : 1,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-x-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 flex-col items-center">
            {showValues && <div className="mono text-[11px] text-fg">{it.value}</div>}
            <div
              className="label mt-1 h-[92px] overflow-hidden text-[9px] leading-none tracking-[0.08em] text-fg-muted"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              title={it.label}
            >
              {it.href ? <a href={it.href} className="hover:text-fg">{it.label}</a> : it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
