"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { IndexRecord } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dimension } from "@/components/ui/Dimension";
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
const VIEW_ORDER: ViewKey[] = ["cards", "plates", "table"];

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
      <p className="mono border border-caution px-4 py-10 text-center text-sm text-caution">
        The fleet index could not be loaded. Reload the page to try again.
      </p>
    );
  }
  if (!data) return <ExplorerSkeleton total={total} />;
  return <Explorer data={data} />;
}

function ExplorerSkeleton({ total }: { total: number }) {
  return (
    <div className="lg:flex" aria-busy>
      <aside className="hidden w-[272px] shrink-0 space-y-3 border-r border-rule px-4 py-4 lg:block">
        <div className="h-8 border border-rule-2 bg-paper-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5 border-t border-rule pt-3">
            <div className="h-2 w-20 bg-paper-3" />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="h-3 bg-paper-2" style={{ opacity: 1 - j * 0.18 }} />
            ))}
          </div>
        ))}
      </aside>
      <section className="min-w-0 flex-1 px-4 py-4 sm:px-6">
        <div className="label mb-3 border-b border-ink pb-2">Reading {total.toLocaleString("en-IN")} records</div>
        <div className="grid grid-cols-1 gap-px border border-rule bg-rule lg:grid-cols-2 min-[1600px]:grid-cols-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-[104px] bg-paper-2/50" style={{ opacity: 1 - i * 0.045 }} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Explorer({ data }: { data: IndexRecord[] }) {
  const sp = useSearchParams();
  const search = sp.toString();
  const urlState = useMemo(() => parseFleetState(search), [search]);
  // Edits live in state and are mirrored to the URL with replaceState; a real
  // navigation changes `search`, which drops the edit and re-reads the URL.
  const [edited, setEdited] = useState<{ base: string; state: FleetState } | null>(null);
  const state = edited && edited.base === search ? edited.state : urlState;

  const update = (next: FleetState) => {
    setEdited({ base: search, state: next });
    const qs = serializeFleetState(next);
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  };
  /** Any change to the query itself starts the reader back at page 1. */
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
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsTopRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Captured before the palette's window listener so "/" belongs to this page.
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

  const items = (key: ListKey): ChecklistItem[] =>
    facets[key].map((f) => ({ value: f.value, label: valueLabel(key, f.value, operatorNames), count: f.count, selected: f.selected }));

  const chips: Array<{ id: string; text: string; onRemove: () => void }> = [];
  if (state.q.trim()) chips.push({ id: "q", text: `“${state.q.trim()}”`, onRemove: () => updateFilters({ ...state, q: "" }) });
  for (const key of LIST_KEYS) {
    for (const value of state.lists[key]) {
      chips.push({
        id: `${key}:${value}`,
        text: `${GROUP_LABEL[key]}: ${valueLabel(key, value, operatorNames)}`,
        onRemove: () => toggle(key, value),
      });
    }
  }
  if (state.smin != null || state.smax != null) {
    chips.push({
      id: "seats",
      text: `Seats: ${state.smin ?? seatBounds[0]}–${state.smax ?? seatBounds[1]}`,
      onRemove: () => updateFilters({ ...state, smin: null, smax: null }),
    });
  }

  const active = countActive(state);

  const filterPanel = (withSearchRef: boolean) => (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">Checklist</span>
        {active > 0 && (
          <button type="button" onClick={clearAll} className="mono text-[10px] uppercase tracking-[0.14em] text-signal hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 border border-ink bg-paper px-2 focus-within:border-signal">
        <span className="mono text-signal" aria-hidden>›</span>
        <input
          ref={withSearchRef ? searchRef : undefined}
          type="search"
          value={state.q}
          onChange={(e) => updateFilters({ ...state, q: e.target.value })}
          placeholder="Reg, hex, operator"
          aria-label="Search the fleet index"
          className="mono w-full bg-transparent py-1.5 text-[12px] placeholder:text-ink-3 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        {withSearchRef && <kbd className="mono hidden shrink-0 border border-rule px-1 text-[10px] text-ink-3 lg:block">/</kbd>}
      </div>

      <div className="mt-4 space-y-4">
        <Checklist title={GROUP_LABEL.c} items={items("c")} onToggle={(v) => toggle("c", v)} initial={4} />
        <Checklist title={GROUP_LABEL.w} items={items("w")} onToggle={(v) => toggle("w", v)} initial={4} />
        <Checklist title={GROUP_LABEL.o} items={items("o")} onToggle={(v) => toggle("o", v)} initial={12} filterPlaceholder="Filter operators" />
        <Checklist title={GROUP_LABEL.mf} items={items("mf")} onToggle={(v) => toggle("mf", v)} initial={8} filterPlaceholder="Filter manufacturers" />
        <Checklist title={GROUP_LABEL.t} items={items("t")} onToggle={(v) => toggle("t", v)} initial={10} filterPlaceholder="Filter types" />
        <Checklist title={GROUP_LABEL.ro} items={items("ro")} onToggle={(v) => toggle("ro", v)} initial={5} />
        <SeatsRange bounds={seatBounds} min={state.smin} max={state.smax} onChange={(smin, smax) => updateFilters({ ...state, smin, smax })} />
        <Checklist title={GROUP_LABEL.y} items={items("y")} onToggle={(v) => toggle("y", v)} initial={6} />
      </div>
    </>
  );

  return (
    <div className="lg:flex">
      {/* Under 1024px the checklist collapses into a disclosure above the results. */}
      <div className="border-b border-ink lg:hidden">
        <details className="group">
          <summary className="label flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span>Filters{active > 0 ? ` (${active})` : ""}</span>
            <span aria-hidden className="mono text-ink-3 motion-safe:transition-transform motion-safe:duration-150 group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-rule px-4 py-4">{filterPanel(false)}</div>
        </details>
      </div>

      {/* 1024px and up: a rail hugging the left edge, sticky below the nav. */}
      <aside className="hidden w-[272px] shrink-0 border-r border-rule px-4 py-4 lg:sticky lg:top-12 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        {filterPanel(true)}
      </aside>

      <section ref={resultsTopRef} className="min-w-0 flex-1 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink pb-2">
          <div className="flex items-stretch border border-rule-2" role="group" aria-label="Result view">
            {VIEW_ORDER.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={state.view === v}
                onClick={() => update({ ...state, view: v })}
                className={`mono px-3 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors duration-150 ${
                  state.view === v ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="fleet-sort" className="label">Sort</label>
            <select
              id="fleet-sort"
              value={state.sort}
              onChange={(e) => updateFilters({ ...state, sort: e.target.value as SortKey })}
              className="mono border border-rule-2 bg-paper px-2 py-1 text-[11px] text-ink focus:border-ink focus:outline-none"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={c.onRemove}
                aria-label={`Remove filter ${c.text}`}
                className="stamp inline-flex items-center gap-1.5 text-ink-2 transition-colors duration-150 hover:text-signal"
              >
                {c.text}
                <span aria-hidden>✕</span>
              </button>
            ))}
            <button type="button" onClick={clearAll} className="mono ml-1 text-[10px] uppercase tracking-[0.14em] text-signal hover:underline">
              Clear all
            </button>
          </div>
        )}

        <div className="my-4" aria-live="polite">
          <Dimension tone={active > 0 ? "signal" : "ink"}>
            {fmtInt(results.length)} {results.length === 1 ? "aircraft matches" : "aircraft match"}
            {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
          </Dimension>
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border border-rule bg-paper-2/50 px-6 py-16 text-center">
            <Silhouette wing="FW" className="h-16 w-36 text-ink-3" />
            <p className="display text-2xl">No aircraft match this checklist</p>
            <p className="text-sm text-ink-2">Loosen a filter, or start again.</p>
            <Button onClick={clearAll}>Clear the checklist</Button>
          </div>
        ) : (
          <>
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={goToPage} className="mb-4" />}

            {state.view === "cards" ? (
              <FleetCards rows={shown} />
            ) : state.view === "plates" ? (
              <FleetPlates rows={shown} />
            ) : (
              <FleetTable rows={shown} />
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={goToPage} />}
              <p className="label label-dim">
                {fmtInt(shown.length)} of {fmtInt(results.length)} shown
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
