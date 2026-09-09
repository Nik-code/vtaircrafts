"use client";

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

const BTN = "num grid h-10 min-w-10 place-items-center rounded-full px-2 text-[14px] text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg disabled:pointer-events-none disabled:opacity-30";
const ACTIVE = "num grid h-10 min-w-10 place-items-center rounded-full bg-fg px-2 text-[14px] font-medium text-bg";

/** Previous, numbered pages with gaps, next. 1-indexed. */
export function Pagination({ page, pageCount, onChange, className = "" }: { page: number; pageCount: number; onChange: (page: number) => void; className?: string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-center gap-1 ${className}`}>
      <button type="button" className={`${BTN} px-3`} onClick={() => onChange(page - 1)} disabled={page === 1}>
        Previous
      </button>
      {pageItems(page, pageCount).map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} aria-hidden className="px-1 text-fg-3">…</span>
        ) : (
          <button key={it} type="button" className={it === page ? ACTIVE : BTN} aria-current={it === page ? "page" : undefined} aria-label={`Page ${it}`} onClick={() => onChange(it)}>
            {it}
          </button>
        ),
      )}
      <button type="button" className={`${BTN} px-3`} onClick={() => onChange(page + 1)} disabled={page === pageCount}>
        Next
      </button>
    </nav>
  );
}
