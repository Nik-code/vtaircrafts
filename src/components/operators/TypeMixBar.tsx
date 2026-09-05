import type { Operator } from "@/lib/types";

/** Repeating ink shades so adjacent segments stay legible without colour. */
const FILLS = ["bg-ink", "hatch-ink bg-paper-3", "bg-ink/60", "bg-ink/30"];

export function segmentFill(i: number) {
  return FILLS[i % FILLS.length];
}

/**
 * A thin stacked bar of one segment per type, widths proportional to the fleet.
 * Segments narrower than a hairline are folded into a final "other" segment.
 */
export function TypeMixBar({ types, total, height = 8 }: { types: Operator["types"]; total: number; height?: number }) {
  const sum = total || types.reduce((n, t) => n + t.count, 0) || 1;
  return (
    <span className="flex w-full border border-rule-2 bg-paper" style={{ height }} aria-hidden>
      {types.map((t, i) => (
        <span
          key={t.name}
          className={`${segmentFill(i)} border-r border-paper last:border-r-0`}
          style={{ width: `${(t.count / sum) * 100}%` }}
          title={`${t.name} · ${t.count}`}
        />
      ))}
    </span>
  );
}

export function TypeMixLegend({ types, limit = 3, className = "" }: { types: Operator["types"]; limit?: number; className?: string }) {
  const seen = new Map<string, number>();
  for (const t of types) if (t.icao) seen.set(t.icao, (seen.get(t.icao) ?? 0) + 1);
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {types.slice(0, limit).map((t, i) => (
        <span key={t.name} className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className={`h-2 w-2 shrink-0 border border-rule-2 ${segmentFill(i)}`} />
          <span className="mono min-w-0 truncate text-[10.5px] text-ink-2">
            {t.icao && seen.get(t.icao) === 1 ? t.icao : t.name}
            <span className="text-ink-3"> {t.count}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
