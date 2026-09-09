"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Event, EventKind } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/fleet/Pagination";
import { fmtDate, fmtInt } from "@/lib/format";
import { eventLabel, eventProse, eventTone } from "./eventFormat";
import { loadEvents } from "./eventsData";

const KINDS: EventKind[] = ["registered", "added", "moved", "removed", "deregistered", "owner-change", "snapshot"];
const LISTS: Category[] = ["scheduled", "non-scheduled"];
const PAGE_SIZE = 100;

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function DateCell({ e }: { e: Event }) {
  if (e.date) return <span className="num text-[14px] text-fg">{fmtDate(e.date)}</span>;
  if (e.from || e.to) {
    return (
      <span className="num text-[14px] text-fg-2" title={`between ${fmtDate(e.from)} and ${fmtDate(e.to)}`}>
        by {fmtDate(e.to)}
      </span>
    );
  }
  return <span className="text-[14px] text-fg-3">—</span>;
}

function monthKeyOf(e: Event): string {
  const d = e.date ?? e.to ?? e.from;
  return d ? d.slice(0, 7) : "undated";
}

function monthLabel(key: string): string {
  if (key === "undated") return "Undated";
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

interface UrlState {
  page: number;
  kinds: Set<EventKind> | null;
  lists: Set<Category> | null;
  q: string | null;
}

function readUrlState(): UrlState {
  if (typeof window === "undefined") return { page: 1, kinds: null, lists: null, q: null };
  const sp = new URLSearchParams(window.location.search);
  return {
    page: Math.max(1, Number(sp.get("p")) || 1),
    kinds: sp.has("k") ? new Set(sp.get("k")!.split(",").filter(Boolean) as EventKind[]) : null,
    lists: sp.has("l") ? new Set(sp.get("l")!.split(",").filter(Boolean) as Category[]) : null,
    q: sp.has("q") ? sp.get("q") : null,
  };
}

/** The full event log, fetched client-side; `counts` gives the chips correct totals before the fetch resolves. */
export function LogTimeline({ counts: serverCounts }: { counts: Record<EventKind, number> }) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [kinds, setKinds] = useState<Set<EventKind>>(() => readUrlState().kinds ?? new Set(KINDS));
  const [lists, setLists] = useState<Set<Category>>(() => readUrlState().lists ?? new Set(LISTS));
  const [q, setQ] = useState<string>(() => readUrlState().q ?? "");
  const [page, setPage] = useState<number>(() => readUrlState().page);

  useEffect(() => {
    loadEvents().then(setEvents).catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (page > 1) sp.set("p", String(page));
    if (kinds.size !== KINDS.length) sp.set("k", [...kinds].join(","));
    if (lists.size !== LISTS.length) sp.set("l", [...lists].join(","));
    if (q) sp.set("q", q);
    const qs = sp.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [page, kinds, lists, q]);

  const counts = useMemo(() => {
    if (!events) return serverCounts;
    const m = new Map<EventKind, number>();
    for (const e of events) m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
    return Object.fromEntries(KINDS.map((k) => [k, m.get(k) ?? 0])) as Record<EventKind, number>;
  }, [events, serverCounts]);

  const filtered = useMemo(() => {
    if (!events) return [];
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (!kinds.has(e.kind)) return false;
      if (e.list && !lists.has(e.list)) return false;
      if (!needle) return true;
      const hay = [e.reg, e.operator, e.fromOperator, e.toOperator, e.type, e.model, e.owner].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [events, kinds, lists, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const visible = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const groups = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of visible) {
      const key = monthKeyOf(e);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return [...m.entries()];
  }, [visible]);

  const loading = events === null && !loadError;

  return (
    <div>
      <div className="flex flex-col gap-4">
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Registration, operator or type"
          aria-label="Search the change log"
          className="field max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((k) => {
            const on = kinds.has(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => { setKinds((s) => toggle(s, k)); setPage(1); }} className={`chip ${on ? "chip-on" : ""}`}>
                {eventLabel(k)}
                <span className={`num ${on ? "opacity-70" : "text-fg-3"}`}>{fmtInt(counts[k] ?? 0)}</span>
              </button>
            );
          })}
          <span className="mx-1 hidden h-5 w-px bg-line-2 sm:block" aria-hidden />
          {LISTS.map((l) => {
            const on = lists.has(l);
            return (
              <button key={l} type="button" aria-pressed={on} onClick={() => { setLists((s) => toggle(s, l)); setPage(1); }} className={`chip ${on ? "chip-on" : ""}`}>
                {l === "scheduled" ? "Scheduled" : "Non-scheduled"}
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? (
        <p className="card mt-8 px-6 py-12 text-center text-fg-2">Could not load the event log.</p>
      ) : loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <p className="card mt-8 px-6 py-12 text-center text-fg-2">No events match these filters.</p>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map(([key, rows]) => {
            const snaps = rows.filter((e) => e.kind === "snapshot");
            const rest = rows.filter((e) => e.kind !== "snapshot");
            return (
              <div key={key}>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="h3">{monthLabel(key)}</h2>
                  <span className="num text-[14px] text-fg-3">{fmtInt(rows.length)} events</span>
                </div>
                {snaps.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {snaps.map((e) => (
                      <li key={e.id} className="text-[14px] text-fg-3">
                        Snapshot · {fmtDate(e.date)} · {e.list} {e.note}
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="divide-y divide-line">
                  {rest.map((e) => (
                    <li key={e.id} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[8.5rem_7.5rem_5.5rem_minmax(0,1fr)] sm:items-baseline">
                      <DateCell e={e} />
                      <span><Badge tone={eventTone(e.kind)}>{eventLabel(e.kind)}</Badge></span>
                      {e.reg ? (
                        <Link href={`/aircraft/${e.reg}`} className="mono text-[15px] font-medium text-fg hover:text-accent">{e.reg}</Link>
                      ) : (
                        <span className="text-fg-3">—</span>
                      )}
                      <span className="text-[15px] text-fg-2">{eventProse(e)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !loadError && filtered.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <span className="num text-[14px] text-fg-3">{fmtInt(filtered.length)} events · page {clampedPage} of {pageCount}</span>
          <Pagination page={clampedPage} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="mt-10 space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-5 rounded bg-bg-2" style={{ width: `${72 - (i % 4) * 8}%` }} />
      ))}
    </div>
  );
}
