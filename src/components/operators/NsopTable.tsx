"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtDate, fmtInt } from "@/lib/format";
import { Silhouette } from "@/components/ui/Silhouette";
import { Pager } from "./Pager";

export interface NsopRow {
  id: string;
  name: string;
  legalName: string;
  permit: string | null;
  validUntil: string | null;
  fw: number;
  rw: number;
  b: number;
  fleet: number;
}

type Key = "name" | "fleet" | "valid";
const PAGE_SIZE = 50;
const COLS =
  "grid-cols-[minmax(0,1fr)_6.5rem_3rem] md:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_3.25rem] lg:grid-cols-[minmax(0,2fr)_5.5rem_6.5rem_9rem_3.25rem]";
const CELL = "grid items-center gap-2 px-3 sm:gap-3";

const HEADERS: Array<{ key: Key | null; label: string; className?: string }> = [
  { key: "name", label: "Operator" },
  { key: null, label: "Permit" },
  { key: "valid", label: "Valid to" },
  { key: null, label: "Airframes" },
  { key: "fleet", label: "AC", className: "text-right" },
];

/** Dense non-scheduled list, sortable by name, valid-to date or fleet size. */
export function NsopTable({ rows }: { rows: NsopRow[] }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "name", desc: false });
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    const out = [...rows];
    out.sort((a, b) => {
      if (sort.key === "fleet") return (a.fleet - b.fleet) * dir || a.name.localeCompare(b.name);
      if (sort.key === "valid") return (a.validUntil ?? "").localeCompare(b.validUntil ?? "") * dir || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name) * dir;
    });
    return out;
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const paged = sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const toggle = (key: Key) => {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key === "fleet" }));
    setPage(1);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="mono text-[11px] text-ink-2">
          {fmtInt(rows.length)} permits · page {clampedPage} of {pageCount}
        </span>
        <Pager page={clampedPage} pageCount={pageCount} onChange={setPage} />
      </div>
      <div className="border border-rule">
      <div className={`label z-20 border-b border-ink bg-paper py-1.5 sm:sticky sm:top-[49px] ${CELL} ${COLS}`}>
        {HEADERS.map((h) =>
          h.key ? (
            <button
              key={h.label}
              type="button"
              onClick={() => toggle(h.key as Key)}
              aria-label={`Sort by ${h.label.toLowerCase()}`}
              className={`flex items-center gap-1 uppercase ${h.className === "text-right" ? "justify-end" : ""} ${sort.key === h.key ? "text-ink" : ""} hover:underline`}
            >
              {h.label}
              <span aria-hidden className={sort.key === h.key ? "text-signal" : "text-ink-3"}>
                {sort.key === h.key ? (sort.desc ? "▼" : "▲") : "↕"}
              </span>
            </button>
          ) : (
            <span key={h.label} className={`${h.className ?? ""} ${h.label === "Permit" ? "hidden md:block" : ""} ${h.label === "Airframes" ? "hidden lg:block" : ""}`}>
              {h.label}
            </span>
          ),
        )}
      </div>
      {paged.map((o, i) => (
        <Link
          key={o.id}
          href={`/operators/${o.id}`}
          className={`row-hover group border-b border-rule py-1.5 last:border-b-0 ${i % 2 === 1 ? "bg-paper-2/40" : ""} ${CELL} ${COLS}`}
        >
          <span className="min-w-0 truncate text-[13px]">
            <span className="text-ink group-hover:text-signal">{o.name}</span>
            {o.legalName && o.legalName !== o.name && <span className="ml-2 hidden text-ink-3 xl:inline">{o.legalName}</span>}
          </span>
          <span className="mono hidden text-[11px] text-ink-2 md:block">{o.permit ?? "—"}</span>
          <span className="mono text-[11px] text-ink-2">{fmtDate(o.validUntil)}</span>
          <span className="hidden items-center gap-3 lg:flex">
            <Wing count={o.fw} wing="FW" />
            <Wing count={o.rw} wing="RW" />
            <Wing count={o.b} wing="B" />
          </span>
          <span className="mono text-right text-[12px] text-ink">{o.fleet}</span>
        </Link>
      ))}
      </div>
      <div className="mt-3 flex justify-center">
        <Pager page={clampedPage} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  );
}

function Wing({ count, wing }: { count: number; wing: "FW" | "RW" | "B" }) {
  if (!count) return null;
  const label = wing === "FW" ? "fixed wing" : wing === "RW" ? "rotary wing" : "balloon";
  return (
    <span className="flex items-center gap-1 text-ink-2" title={`${count} ${label}`}>
      <Silhouette wing={wing} className="h-3.5 w-6 shrink-0 text-ink-3" strokeWidth={2.4} />
      <span className="mono text-[11px]">{count}</span>
    </span>
  );
}
