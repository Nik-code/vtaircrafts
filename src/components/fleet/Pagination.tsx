"use client";

/**
 * First / previous / numbered-with-ellipsis / next / last, drawn as a row of
 * mono sheet buttons. `page` and `pageCount` are 1-indexed.
 */
export function pageItems(page: number, pageCount: number): Array<number | "…"> {
  const keep = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const items: Array<number | "…"> = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) items.push("…");
    items.push(n);
    prev = n;
  }
  return items;
}

const BTN =
  "mono grid h-7 min-w-7 place-items-center border border-rule-2 px-1.5 text-[11px] text-ink-2 transition-colors duration-150 hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35";
const ACTIVE = "mono grid h-7 min-w-7 place-items-center border border-ink bg-ink px-1.5 text-[11px] text-paper";

export function Pagination({
  page,
  pageCount,
  onChange,
  className = "",
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const items = pageItems(page, pageCount);

  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-center gap-1 ${className}`}>
      <button type="button" className={BTN} onClick={() => onChange(1)} disabled={page === 1} aria-label="First page">
        «
      </button>
      <button type="button" className={BTN} onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
        ‹
      </button>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} aria-hidden className="mono px-1 text-[11px] text-ink-3">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            className={it === page ? ACTIVE : BTN}
            aria-current={it === page ? "page" : undefined}
            aria-label={`Page ${it}`}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        className={BTN}
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
      >
        ›
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() => onChange(pageCount)}
        disabled={page === pageCount}
        aria-label="Last page"
      >
        »
      </button>
    </nav>
  );
}
