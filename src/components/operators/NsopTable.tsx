"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtDate, fmtInt } from "@/lib/format";
import { Pagination } from "@/components/fleet/Pagination";

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
const COLS = "grid-cols-[minmax(0,1fr)_3rem] sm:grid-cols-[minmax(0,1fr)_6.5rem_3rem] md:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_9rem_3rem]";
const CELL = "grid items-center gap-3 px-3 sm:px-4";

const HEADERS: Array<{ key: Key | null; label: string; className?: string }> = [
  { key: "name", label: "Operator" },
  { key: null, label: "Permit", className: "hidden md:block" },
  { key: "valid", label: "Valid to", className: "hidden sm:block" },
  { key: null, label: "Airframes", className: "hidden md:block" },
  { key: "fleet", label: "Fleet", className: "text-right" },
];

/** Non-scheduled operators, sortable by name, validity or fleet size. */
export function NsopTable({ rows }: { rows: NsopRow[] }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "fleet", desc: true });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const sorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const dir = sort.desc ? -1 : 1;
    const out = needle ? rows.filter((r) => `${r.name} ${r.legalName} ${r.permit ?? ""}`.toLowerCase().includes(needle)) : [...rows];
    out.sort((a, b) => {
      if (sort.key === "fleet") return (a.fleet - b.fleet) * dir || a.name.localeCompare(b.name);
      if (sort.key === "valid") return (a.validUntil ?? "").localeCompare(b.validUntil ?? "") * dir || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name) * dir;
    });
    return out;
  }, [rows, sort, q]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const paged = sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const toggle = (key: Key) => {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key === "fleet" }));
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Find an operator"
          aria-label="Find a non-scheduled operator"
          className="field max-w-xs py-2 text-[14px]"
        />
        <span className="num text-[14px] text-fg-3">{fmtInt(sorted.length)} operators</span>
      </div>
      <div className="card overflow-hidden">
        <div className={`${CELL} ${COLS} border-b border-line py-2.5 text-[13px] font-medium text-fg-3`}>
          {HEADERS.map((h) =>
            h.key ? (
              <button
                key={h.label}
                type="button"
                onClick={() => toggle(h.key as Key)}
                className={`flex items-center gap-1 ${h.className ?? ""} ${h.className === "text-right" ? "justify-end" : ""} ${sort.key === h.key ? "text-fg" : "hover:text-fg"}`}
              >
                {h.label}
                {sort.key === h.key && <span aria-hidden>{sort.desc ? "↓" : "↑"}</span>}
              </button>
            ) : (
              <span key={h.label} className={h.className}>{h.label}</span>
            ),
          )}
        </div>
        <ul className="divide-y divide-line">
          {paged.map((o) => (
            <li key={o.id}>
              <Link href={`/operators/${o.id}`} className={`row ${CELL} ${COLS} py-3`}>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-fg">{o.name}</span>
                  {o.legalName && o.legalName !== o.name && <span className="block truncate text-[13px] text-fg-3">{o.legalName}</span>}
                </span>
                <span className="mono hidden text-[13px] text-fg-2 md:block">{o.permit ?? "—"}</span>
                <span className="num hidden text-[14px] text-fg-2 sm:block">{fmtDate(o.validUntil)}</span>
                <span className="hidden text-[13px] text-fg-3 md:block">
                  {[o.fw && `${o.fw} fixed`, o.rw && `${o.rw} rotary`, o.b && `${o.b} balloon`].filter(Boolean).join(" · ")}
                </span>
                <span className="num text-right text-[15px] font-medium text-fg">{o.fleet}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Pagination page={clampedPage} pageCount={pageCount} onChange={setPage} className="mt-6" />
    </div>
  );
}
