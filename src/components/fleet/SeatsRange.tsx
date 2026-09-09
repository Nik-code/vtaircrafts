"use client";

/** Seat-count window as two number inputs. */
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
  const active = min != null || max != null;

  const parse = (raw: string) => {
    if (raw.trim() === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : null;
  };

  return (
    <section>
      <h3 className="mb-2 flex items-baseline justify-between text-[13px] font-medium uppercase tracking-[0.02em] text-fg-3">
        Seats
        {active && (
          <button type="button" onClick={() => onChange(null, null)} className="normal-case tracking-normal text-accent hover:underline">
            Reset
          </button>
        )}
      </h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={String(lo)}
          value={min ?? ""}
          onChange={(e) => onChange(parse(e.target.value), max)}
          aria-label="Minimum seats"
          className="field num py-2 text-[14px]"
        />
        <span className="text-fg-3">to</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={String(hi)}
          value={max ?? ""}
          onChange={(e) => onChange(min, parse(e.target.value))}
          aria-label="Maximum seats"
          className="field num py-2 text-[14px]"
        />
      </div>
    </section>
  );
}
