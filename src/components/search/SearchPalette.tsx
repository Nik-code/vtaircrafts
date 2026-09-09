"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IndexRecord } from "@/lib/types";
import { loadIndex } from "@/components/fleet/indexData";
import { ListBadge, Badge } from "@/components/ui/Badge";
import { pushRecent, rank, readRecent } from "./rank";

const MAX_AIRCRAFT = 8;
const MAX_OPERATORS = 4;
const MAX_TYPES = 4;

/** Global search: a compact trigger in the nav that opens a command palette. */
export function SearchPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex h-10 items-center gap-2 rounded-full px-3 text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg sm:border sm:border-line-2 sm:pr-2.5"
      >
        <SearchGlyph className="h-4 w-4 shrink-0" />
        <span className="hidden text-[14px] sm:inline">Search</span>
        <kbd className="mono ml-3 hidden rounded bg-bg-3 px-1.5 py-0.5 text-[11px] text-fg-3 sm:inline">⌘K</kbd>
      </button>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

type Row =
  | { key: string; group: string; kind: "aircraft"; href: string; rec: IndexRecord }
  | { key: string; group: string; kind: "operator"; href: string; name: string; count: number }
  | { key: string; group: string; kind: "type"; href: string; name: string; icao: string | null; count: number }
  | { key: string; group: string; kind: "all"; href: string; label: string }
  | { key: string; group: string; kind: "recent"; value: string };

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<IndexRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigated = useRef(false);

  useEffect(() => {
    let alive = true;
    loadIndex().then(
      (d) => { if (alive) setData(d); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
      if (!navigated.current && opener && document.contains(opener)) opener.focus();
    };
  }, []);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim();
    if (!q) return recent.map((value, i) => ({ key: `recent-${i}`, group: "Recent searches", kind: "recent", value }));
    if (!data) return [];
    const r = rank(data, q);
    const out: Row[] = [];
    for (const hit of r.aircraft.slice(0, MAX_AIRCRAFT)) {
      out.push({ key: `a-${hit.rec.r}`, group: "Aircraft", kind: "aircraft", href: `/aircraft/${hit.rec.r}`, rec: hit.rec });
    }
    for (const hit of r.operators.slice(0, MAX_OPERATORS)) {
      out.push({ key: `o-${hit.id}`, group: "Operators", kind: "operator", href: `/operators/${hit.id}`, name: hit.name, count: hit.count });
    }
    for (const hit of r.types.slice(0, MAX_TYPES)) {
      out.push({ key: `t-${hit.name}`, group: "Types", kind: "type", href: `/fleet?t=${encodeURIComponent(hit.name)}`, name: hit.name, icao: hit.icao, count: hit.count });
    }
    if (r.aircraft.length + r.operators.length + r.types.length > 0) {
      out.push({ key: "all", group: "Fleet index", kind: "all", href: `/fleet?q=${encodeURIComponent(q)}`, label: `Search the fleet index for “${q}”` });
    }
    return out;
  }, [data, query, recent]);

  const activeIndex = rows.length ? Math.min(active, rows.length - 1) : -1;
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;
  const groups = useMemo(() => {
    const out: Array<{ name: string; rows: Row[] }> = [];
    for (const row of rows) {
      const last = out[out.length - 1];
      if (last && last.name === row.group) last.rows.push(row);
      else out.push({ name: row.group, rows: [row] });
    }
    return out;
  }, [rows]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, rows]);

  const commit = (row: Row) => {
    if (row.kind === "recent") {
      setQuery(row.value);
      setActive(0);
      inputRef.current?.focus();
      return;
    }
    if (query.trim()) setRecent(pushRecent(query));
    navigated.current = true;
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (rows.length ? (i + 1) % rows.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
      return;
    }
    if (e.key === "Enter") {
      const row = activeRow;
      if (!row) return;
      e.preventDefault();
      commit(row);
      if (row.kind !== "recent") router.push(row.href);
      return;
    }
    if (e.key === "Tab") {
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div
        className="absolute -inset-4 bg-black/60"
        style={{ animation: "rise 150ms var(--ease-out) both" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[8vh]"
        role="presentation"
        onMouseDown={(e) => {
          // Only the backdrop itself should close the palette; clicks that
          // bubble up from the dialog (or anything inside it) must not.
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Search the fleet index"
          onKeyDown={onKeyDown}
          className="card relative w-full max-w-[640px] overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
          style={{ animation: "rise 150ms var(--ease-out) both" }}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <SearchGlyph className="h-4 w-4 shrink-0 text-fg-3" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={rows.length > 0}
              aria-controls="search-results"
              aria-autocomplete="list"
              aria-activedescendant={activeRow ? `search-row-${activeRow.key}` : undefined}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              placeholder="Registration, hex, operator, type"
              className="w-full bg-transparent py-1 text-[17px] placeholder:text-fg-3 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={onClose} className="mono shrink-0 rounded bg-bg-3 px-1.5 py-0.5 text-[11px] text-fg-3 hover:text-fg">esc</button>
          </div>

          <div ref={listRef} id="search-results" role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto py-1">
            {failed && <Note>The index could not be loaded. Try the fleet page.</Note>}
            {!failed && !data && query.trim() && <Note>Loading the index…</Note>}
            {!failed && !query.trim() && rows.length === 0 && (
              <Note>Search by registration (ANU or VT-ANU), Mode S hex, operator, type or ICAO code.</Note>
            )}
            {!failed && query.trim() && data && rows.length === 0 && <Note>Nothing matches “{query.trim()}”.</Note>}
            {groups.map((group) => (
              <div key={group.name} role="group" aria-label={group.name}>
                <div className="sticky top-0 z-10 bg-bg-2 px-4 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.02em] text-fg-3">
                  {group.name}
                </div>
                {group.rows.map((row) => {
                  const i = rows.indexOf(row);
                  return (
                    <PaletteRow
                      key={row.key}
                      row={row}
                      on={i === activeIndex}
                      onHover={() => setActive(i)}
                      onSelect={() => commit(row)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[12px] text-fg-3">
            <span className="hidden sm:inline">↑↓ to move · ↵ to open · esc to close</span>
            <span className="sm:hidden">↵ to open</span>
            <span>{query.trim() && data ? `${rows.length} results` : ""}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-[15px] text-fg-2">{children}</p>;
}

function PaletteRow({ row, on, onHover, onSelect }: { row: Row; on: boolean; onHover: () => void; onSelect: () => void }) {
  const shared = `mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors ${on ? "bg-bg-3" : "bg-transparent"}`;
  const marker = null;

  if (row.kind === "recent") {
    return (
      <button type="button" id={`search-row-${row.key}`} role="option" aria-selected={on} data-active={on} tabIndex={-1} onMouseMove={onHover} onFocus={onHover} onClick={onSelect} className={shared}>
        {marker}
        <span className="text-fg-3" aria-hidden>↺</span>
        <span className="min-w-0 flex-1 truncate text-[15px]">{row.value}</span>
      </button>
    );
  }

  const content =
    row.kind === "aircraft" ? (
      <>
        <span className="mono w-[5.5rem] shrink-0 text-[15px] font-medium">{row.rec.r}</span>
        <span className="min-w-0 flex-1 truncate text-[15px]">{row.rec.t}</span>
        <span className="hidden min-w-0 flex-1 truncate text-[15px] text-fg-2 sm:block">{row.rec.on}</span>
        <ListBadge scheduled={row.rec.c === "S"} short />
      </>
    ) : row.kind === "operator" ? (
      <>
        <span className="min-w-0 flex-1 truncate text-[15px]">{row.name}</span>
        <span className="num text-[13px] text-fg-3">{row.count.toLocaleString("en-IN")} aircraft</span>
      </>
    ) : row.kind === "type" ? (
      <>
        <span className="min-w-0 flex-1 truncate text-[15px]">{row.name}</span>
        {row.icao && <Badge>{row.icao}</Badge>}
        <span className="num text-[13px] text-fg-3">{row.count.toLocaleString("en-IN")}</span>
      </>
    ) : (
      <span className="min-w-0 flex-1 truncate text-[15px] text-fg-2">{row.label}</span>
    );

  return (
    <Link
      href={row.href}
      id={`search-row-${row.key}`}
      role="option"
      aria-selected={on}
      data-active={on}
      tabIndex={-1}
      onMouseMove={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={shared}
    >
      {marker}
      {content}
    </Link>
  );
}

function SearchGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" strokeLinecap="round" />
    </svg>
  );
}
