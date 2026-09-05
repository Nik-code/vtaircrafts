/** Page numbers to render, with "…" gaps collapsed — first, last, and a window around current. */
export function pageList(current: number, total: number): Array<number | "…"> {
  if (total <= 1) return total === 1 ? [1] : [];
  const delta = 1;
  const mid: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) mid.push(i);
  const out: Array<number | "…"> = [1];
  if (mid[0] > 2) out.push("…");
  out.push(...mid);
  if (mid[mid.length - 1] < total - 1) out.push("…");
  out.push(total);
  return out;
}

const btn =
  "mono border border-rule-2 px-2.5 py-1 text-[11px] uppercase tracking-[0.06em] transition-colors duration-150 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-rule-2";

/** Row of mono buttons in the sheet style: first, previous, numbered pages with ellipsis, next, last. */
export function LogPager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className={btn} disabled={page === 1} onClick={() => onChange(1)}>
        First
      </button>
      <button type="button" className={btn} disabled={page === 1} onClick={() => onChange(page - 1)}>
        ‹ Prev
      </button>
      {pageList(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="mono px-1 text-[11px] text-ink-3">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            className={`${btn} ${p === page ? "border-signal text-signal hover:border-signal" : "text-ink-2"}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={btn} disabled={page === pageCount} onClick={() => onChange(page + 1)}>
        Next ›
      </button>
      <button type="button" className={btn} disabled={page === pageCount} onClick={() => onChange(pageCount)}>
        Last
      </button>
    </nav>
  );
}
