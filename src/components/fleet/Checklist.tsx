"use client";
import { useState } from "react";

export interface ChecklistItem {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

/** Square drafting tick box: hairline when empty, solid ink with a check when set. */
export function TickBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-3.5 w-3.5 shrink-0 place-items-center border transition-colors duration-150 ${on ? "border-ink bg-ink" : "border-rule-2 bg-paper"}`}
    >
      {on && (
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-paper" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.4 5.2 3.9 7.7 8.6 2.4" />
        </svg>
      )}
    </span>
  );
}

/**
 * One filter group of the checklist column: a labelled list of tick boxes with
 * right-aligned counts. Long groups collapse to `initial` rows behind a "show all"
 * that reveals a scrollable list with an inline filter box.
 */
export function Checklist({
  title,
  items,
  onToggle,
  initial = 8,
  filterPlaceholder = "Filter",
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (value: string) => void;
  initial?: number;
  filterPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [needle, setNeedle] = useState("");
  if (items.length === 0) return null;

  const activeCount = items.reduce((n, it) => n + (it.selected ? 1 : 0), 0);
  const overflow = items.length > initial;
  const n = needle.trim().toLowerCase();
  const filtered = open && n ? items.filter((it) => it.label.toLowerCase().includes(n)) : items;
  const shown = open ? filtered : items.slice(0, initial);

  return (
    <section className="border-t border-rule pt-3">
      <h3 className="label mb-2 flex items-center gap-2">
        <span aria-hidden className={`h-1.5 w-1.5 ${activeCount ? "bg-signal" : "bg-rule-2"}`} />
        {title}
        {activeCount > 0 && <span className="mono ml-auto text-[10px] text-signal">{activeCount} set</span>}
      </h3>

      {open && overflow && (
        <input
          type="text"
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
          placeholder={filterPlaceholder}
          aria-label={`Filter ${title.toLowerCase()} options`}
          className="mono mb-2 w-full border border-rule bg-paper px-2 py-1 text-[11px] placeholder:text-ink-3 focus:border-ink focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
      )}

      <ul className={open && overflow ? "max-h-64 space-y-px overflow-y-auto pr-1" : "space-y-px"}>
        {shown.map((it) => (
          <li key={it.value}>
            <button
              type="button"
              aria-pressed={it.selected}
              onClick={() => onToggle(it.value)}
              className={`flex w-full items-center gap-2 py-[3px] pr-1 text-left text-[13px] leading-tight transition-colors duration-150 ${it.selected ? "text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              <TickBox on={it.selected} />
              <span className="min-w-0 flex-1 truncate" title={it.label}>{it.label}</span>
              <span className={`mono text-[11px] tabular-nums ${it.selected ? "text-ink" : "text-ink-3"}`}>{it.count.toLocaleString("en-IN")}</span>
            </button>
          </li>
        ))}
        {open && filtered.length === 0 && <li className="py-1 text-[12px] text-ink-3">No match</li>}
      </ul>

      {overflow && (
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setNeedle(""); }}
          className="label label-dim mt-1.5 underline-offset-2 hover:underline"
        >
          {open ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
