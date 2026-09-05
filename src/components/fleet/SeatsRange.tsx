"use client";

/**
 * Seat-count window as two mono inputs over a dimension track showing the
 * selected span against the full range in the data.
 */
export function SeatsRange({
  bounds,
  min,
  max,
  onChange,
}: {
  bounds: [number, number];
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const [lo, hi] = bounds;
  const span = Math.max(1, hi - lo);
  const active = min != null || max != null;
  const from = Math.min(Math.max(min ?? lo, lo), hi);
  const to = Math.min(Math.max(max ?? hi, lo), hi);
  const left = ((Math.min(from, to) - lo) / span) * 100;
  const right = ((Math.max(from, to) - lo) / span) * 100;

  const parse = (raw: string) => {
    if (raw.trim() === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : null;
  };

  return (
    <section className="border-t border-rule pt-3">
      <h3 className="label mb-2 flex items-center gap-2">
        <span aria-hidden className={`h-1.5 w-1.5 ${active ? "bg-signal" : "bg-rule-2"}`} />
        Seats
        {active && (
          <button type="button" onClick={() => onChange(null, null)} className="mono ml-auto text-[10px] text-signal hover:underline">
            Reset
          </button>
        )}
      </h3>

      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="sr-only">Minimum seats</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={hi}
            value={min ?? ""}
            placeholder={String(lo)}
            onChange={(e) => onChange(parse(e.target.value), max)}
            className="mono w-full border border-rule bg-paper px-2 py-1 text-[12px] tabular-nums placeholder:text-ink-3 focus:border-ink focus:outline-none"
          />
        </label>
        <span aria-hidden className="h-px w-3 bg-rule-2" />
        <label className="flex-1">
          <span className="sr-only">Maximum seats</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={hi}
            value={max ?? ""}
            placeholder={String(hi)}
            onChange={(e) => onChange(min, parse(e.target.value))}
            className="mono w-full border border-rule bg-paper px-2 py-1 text-[12px] tabular-nums placeholder:text-ink-3 focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      <div className="relative mt-2.5 h-1.5" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule-2" />
        <span className="absolute left-0 top-0 h-1.5 w-px bg-rule-2" />
        <span className="absolute right-0 top-0 h-1.5 w-px bg-rule-2" />
        <span
          className={`absolute top-1/2 h-[3px] -translate-y-1/2 ${active ? "bg-signal" : "bg-ink"}`}
          style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%` }}
        />
      </div>
      <p className="mono mt-1.5 text-[10.5px] leading-tight text-ink-3">
        {active ? "Aircraft with no published seat count are hidden" : `Range in the list: ${lo}–${hi}`}
      </p>
    </section>
  );
}
