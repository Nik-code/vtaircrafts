"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { IndexRecord } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Silhouette } from "@/components/ui/Silhouette";
import { Checklist, type ChecklistItem } from "./Checklist";
import { FleetCards } from "./FleetCards";
import { FleetPlates } from "./FleetPlates";
import { FleetTable } from "./FleetTable";
import { Pagination } from "./Pagination";
import { SeatsRange } from "./SeatsRange";
import { loadIndex } from "./indexData";
import {
  EMPTY_LISTS,
  GROUP_LABEL,
  LIST_KEYS,
  SORT_LABEL,
  type FleetState,
  type ListKey,
  type SortKey,
  type ViewKey,
  countActive,
  parseFleetState,
  runFleetQuery,
  serializeFleetState,
  valueLabel,
} from "./filters";

const PAGE_SIZE = 48;
const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: "cards", label: "Cards" },
  { key: "plates", label: "Photos" },
  { key: "table", label: "Table" },
];

export function FleetExplorer({ total }: { total: number }) {
  const [data, setData] = useState<IndexRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadIndex().then(
      (d) => { if (alive) setData(d); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, []);

  if (failed) {
    return (
      <Container wide>
        <p className="card px-6 py-12 text-center text-fg-2">The fleet index could not be loaded. Reload the page to try again.</p>
      </Container>
    );
  }
  if (!data) return <Skeleton total={total} />;
  return <Explorer data={data} />;
}

function Skeleton({ total }: { total: number }) {
  return (
    <Container wide className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10" aria-busy>
      <div className="hidden space-y-6 lg:block">
        <div className="h-11 rounded-[var(--radius-sm)] bg-bg-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded bg-bg-3" />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="h-4 rounded bg-bg-2" style={{ opacity: 1 - j * 0.2 }} />
            ))}
          </div>
        ))}
      </div>
      <div>
        <p className="mb-4 text-[15px] text-fg-3">Reading {fmtInt(total)} records…</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[112px] rounded-[var(--radius-md)] bg-bg-2" style={{ opacity: 1 - i * 0.06 }} />
          ))}
        </div>
      </div>
    </Container>
  );
}

function Explorer({ data }: { data: IndexRecord[] }) {
  const sp = useSearchParams();
  const search = sp.toString();
  const urlState = useMemo(() => parseFleetState(search), [search]);
  const [edited, setEdited] = useState<{ base: string; state: FleetState } | null>(null);
  const state = edited && edited.base === search ? edited.state : urlState;
  const [sheetOpen, setSheetOpen] = useState(false);

  const update = (next: FleetState) => {
    setEdited({ base: search, state: next });
    const qs = serializeFleetState(next);
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  };
  const updateFilters = (next: Omit<FleetState, "page">) => update({ ...next, page: 1 });
  const toggle = (key: ListKey, value: string) => {
    const current = state.lists[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateFilters({ ...state, lists: { ...state.lists, [key]: next } });
  };
  const clearAll = () => updateFilters({ ...state, q: "", lists: EMPTY_LISTS, smin: null, smax: null });

  const { results, facets } = useMemo(() => runFleetQuery(data, state), [data, state]);
  const operatorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of data) if (!m.has(a.o)) m.set(a.o, a.on);
    return m;
  }, [data]);
  const seatBounds = useMemo<[number, number]>(() => {
    let lo = Infinity;
    let hi = 0;
    for (const a of data) {
      if (a.s == null) continue;
      if (a.s < lo) lo = a.s;
      if (a.s > hi) hi = a.s;
    }
    return [Number.isFinite(lo) ? lo : 0, hi];
  }, [data]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), pageCount);
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resultsTopRef = useRef<HTMLDivElement>(null);
  const goToPage = (p: number) => {
    update({ ...state, page: p });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsTopRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  // Lock scroll while the mobile sheet is open.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [sheetOpen]);

  const items = (key: ListKey): ChecklistItem[] =>
    facets[key].map((f) => ({ value: f.value, label: valueLabel(key, f.value, operatorNames), count: f.count, selected: f.selected }));

  const chips: Array<{ id: string; text: string; onRemove: () => void }> = [];
  if (state.q.trim()) chips.push({ id: "q", text: `“${state.q.trim()}”`, onRemove: () => updateFilters({ ...state, q: "" }) });
  for (const key of LIST_KEYS) {
    for (const value of state.lists[key]) {
      chips.push({ id: `${key}:${value}`, text: valueLabel(key, value, operatorNames), onRemove: () => toggle(key, value) });
    }
  }
  if (state.smin != null || state.smax != null) {
    chips.push({
      id: "seats",
      text: `${state.smin ?? seatBounds[0]}–${state.smax ?? seatBounds[1]} seats`,
      onRemove: () => updateFilters({ ...state, smin: null, smax: null }),
    });
  }

  const active = countActive(state);

  const filterPanel = (withSearchRef: boolean) => (
    <div className="space-y-7">
      <input
        ref={withSearchRef ? searchRef : undefined}
        type="search"
        value={state.q}
        onChange={(e) => updateFilters({ ...state, q: e.target.value })}
        placeholder="Registration, hex, operator, type"
        aria-label="Search the fleet"
        className="field"
        spellCheck={false}
        autoComplete="off"
      />
      <Checklist title={GROUP_LABEL.c} items={items("c")} onToggle={(v) => toggle("c", v)} initial={4} />
      <Checklist title={GROUP_LABEL.w} items={items("w")} onToggle={(v) => toggle("w", v)} initial={4} />
      <Checklist title={GROUP_LABEL.o} items={items("o")} onToggle={(v) => toggle("o", v)} initial={8} filterPlaceholder="Find an operator" />
      <Checklist title={GROUP_LABEL.mf} items={items("mf")} onToggle={(v) => toggle("mf", v)} initial={6} filterPlaceholder="Find a manufacturer" />
      <Checklist title={GROUP_LABEL.t} items={items("t")} onToggle={(v) => toggle("t", v)} initial={8} filterPlaceholder="Find a type" />
      <Checklist title={GROUP_LABEL.ro} items={items("ro")} onToggle={(v) => toggle("ro", v)} initial={5} />
      <SeatsRange bounds={seatBounds} min={state.smin} max={state.smax} onChange={(smin, smax) => updateFilters({ ...state, smin, smax })} />
      <Checklist title={GROUP_LABEL.y} items={items("y")} onToggle={(v) => toggle("y", v)} initial={5} />
    </div>
  );

  return (
    <Container wide className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
      {/* Desktop rail */}
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2 lg:pb-8">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="h3">Filters</h2>
          {active > 0 && (
            <button type="button" onClick={clearAll} className="text-[14px] text-accent hover:underline">
              Clear all
            </button>
          )}
        </div>
        {filterPanel(true)}
      </aside>

      {/* Mobile sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[var(--radius-lg)] bg-bg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="h3">Filters</h2>
              <div className="flex items-center gap-3">
                {active > 0 && (
                  <button type="button" onClick={clearAll} className="text-[14px] text-accent">Clear all</button>
                )}
                <button type="button" onClick={() => setSheetOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-bg-3 text-fg" aria-label="Close">
                  <CloseGlyph />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{filterPanel(false)}</div>
            <div className="border-t border-line p-4">
              <Button tone="primary" className="w-full" onClick={() => setSheetOpen(false)}>
                Show {fmtInt(results.length)} aircraft
              </Button>
            </div>
          </div>
        </div>
      )}

      <section ref={resultsTopRef} className="min-w-0 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setSheetOpen(true)} className="btn btn-secondary btn-sm lg:hidden">
            <FilterGlyph />
            Filters{active > 0 ? ` · ${active}` : ""}
          </button>

          <div className="flex rounded-full bg-bg-2 p-1" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                aria-pressed={state.view === v.key}
                onClick={() => update({ ...state, view: v.key })}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${
                  state.view === v.key ? "bg-fg text-bg" : "text-fg-2 hover:text-fg"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 text-[14px] text-fg-3">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={state.sort}
              onChange={(e) => updateFilters({ ...state, sort: e.target.value as SortKey })}
              className="field w-auto py-2 text-[14px]"
              aria-label="Sort"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABEL[k]}</option>
              ))}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button key={c.id} type="button" onClick={c.onRemove} aria-label={`Remove filter ${c.text}`} className="chip">
                {c.text}
                <CloseGlyph size={12} />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="px-2 text-[14px] text-accent hover:underline">Clear all</button>
          </div>
        )}

        <p className="num mt-6 text-[15px] text-fg-2" aria-live="polite">
          <span className="font-semibold text-fg">{fmtInt(results.length)}</span> {results.length === 1 ? "aircraft" : "aircraft"}
          {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
        </p>

        {results.length === 0 ? (
          <div className="card mt-6 flex flex-col items-center gap-4 px-6 py-16 text-center">
            <Silhouette wing="FW" className="h-16 w-36 text-fg-3" />
            <p className="h3">No aircraft match these filters</p>
            <p className="text-fg-2">Loosen a filter, or start again.</p>
            <Button onClick={clearAll}>Clear all filters</Button>
          </div>
        ) : (
          <div className="mt-6">
            {state.view === "cards" ? <FleetCards rows={shown} /> : state.view === "plates" ? <FleetPlates rows={shown} /> : <FleetTable rows={shown} />}
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={goToPage} className="mt-10" />}
          </div>
        )}
      </section>
    </Container>
  );
}

function FilterGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M4.5 8h7M7 12h2" />
    </svg>
  );
}

function CloseGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
