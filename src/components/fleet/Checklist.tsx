"use client";
import { useState } from "react";

export interface ChecklistItem {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export function TickBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ${
        on ? "border-fg bg-fg" : "border-line-2 bg-transparent"
      }`}
    >
      {on && (
        <svg viewBox="0 0 10 10" className="h-3 w-3 text-bg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.8 5.2 4.1 7.5 8.4 2.6" />
        </svg>
      )}
    </span>
  );
}

/**
 * One filter group: a titled list of tick rows with counts. Long groups show
 * `initial` rows and reveal the rest behind "Show all", with an inline finder.
 */
export function Checklist({
  title,
  items,
  onToggle,
  initial = 8,
  filterPlaceholder = "Find",
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
    <section>
      <h3 className="mb-2 flex items-baseline justify-between text-[13px] font-medium uppercase tracking-[0.02em] text-fg-3">
        {title}
        {activeCount > 0 && <span className="normal-case tracking-normal text-accent">{activeCount} selected</span>}
      </h3>

      {open && overflow && (
        <input
          type="text"
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
          placeholder={filterPlaceholder}
          aria-label={`${filterPlaceholder} in ${title.toLowerCase()}`}
          className="field mb-2 py-2 text-[14px]"
          spellCheck={false}
          autoComplete="off"
        />
      )}

      <ul className={open && overflow ? "max-h-72 overflow-y-auto pr-1" : ""}>
        {shown.map((it) => (
          <li key={it.value}>
            <button
              type="button"
              aria-pressed={it.selected}
              onClick={() => onToggle(it.value)}
              className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-[15px] leading-tight transition-colors hover:bg-bg-2 ${
                it.selected ? "text-fg" : "text-fg-2"
              }`}
            >
              <TickBox on={it.selected} />
              <span className="min-w-0 flex-1 truncate" title={it.label}>{it.label}</span>
              <span className={`num text-[13px] ${it.selected ? "text-fg" : "text-fg-3"}`}>{it.count.toLocaleString("en-IN")}</span>
            </button>
          </li>
        ))}
        {open && filtered.length === 0 && <li className="py-1 text-[14px] text-fg-3">No match</li>}
      </ul>

      {overflow && (
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setNeedle(""); }}
          className="mt-1.5 text-[14px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg"
        >
          {open ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
