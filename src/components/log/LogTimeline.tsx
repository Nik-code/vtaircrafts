"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Event, EventKind } from "@/lib/types";
import { Stamp, type StampTone } from "@/components/ui/Stamp";
import { fmtDate, fmtInt } from "@/lib/format";
import { eventLabel, eventProse, eventTone } from "./eventFormat";
import { loadEvents } from "./eventsData";
import { LogPager } from "./LogPager";
import styles from "./LogTimeline.module.css";

const KINDS: EventKind[] = ["registered", "added", "moved", "removed", "deregistered", "owner-change", "snapshot"];
const LISTS: Category[] = ["scheduled", "non-scheduled"];
const PAGE_SIZE = 100;
const DATE_W = "w-[9.5rem] whitespace-nowrap";
const REG_W = "w-[4.5rem]";

const TONE_TEXT: Record<StampTone, string> = {
  ink: "text-ink",
  signal: "text-signal",
  mint: "text-mint",
  caution: "text-caution",
  dim: "text-ink-3",
  light: "text-paper",
};

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Fixed-width mono date cell: an exact date when one is known, else the honest bracket. */
function DateCell({ e }: { e: Event }) {
  if (e.date) {
    return <span className={`mono shrink-0 ${DATE_W} text-[13px] text-ink`}>{fmtDate(e.date)}</span>;
  }
  if (e.from || e.to) {
    return (
      <span className={`mono shrink-0 ${DATE_W} text-[13px] text-ink-2`} title={`between ${fmtDate(e.from)} and ${fmtDate(e.to)}`}>
        <span aria-hidden className="text-ink-3">≈</span> by {fmtDate(e.to)}
      </span>
    );
  }
  return <span className={`mono shrink-0 ${DATE_W} text-[13px] text-ink-3`}>—</span>;
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

/**
 * Full events list is fetched client-side (see eventsData.ts) so the server-rendered
 * HTML stays under budget; `counts` (a handful of numbers) is the only aggregate the
 * server hands down, so the kind chips render correct totals before the fetch resolves.
 */
export function LogTimeline({ counts: serverCounts }: { counts: Record<EventKind, number> }) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Read once from the URL on mount (lazy initializer, not an effect) so there is no
  // setState-in-effect cascade; on the server this always resolves to the defaults.
  const [kinds, setKinds] = useState<Set<EventKind>>(() => readUrlState().kinds ?? new Set(KINDS));
  const [lists, setLists] = useState<Set<Category>>(() => readUrlState().lists ?? new Set(LISTS));
  const [q, setQ] = useState<string>(() => readUrlState().q ?? "");
  const [page, setPage] = useState<number>(() => readUrlState().page);

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch(() => setLoadError(true));
  }, []);

  // Keep the URL in sync — cheap: history.replaceState only, no navigation, no refetch.
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
      const hay = [e.reg, e.operator, e.fromOperator, e.toOperator, e.type, e.model, e.owner]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [events, kinds, lists, q]);

  function toggleKind(k: EventKind) {
    setKinds((s) => toggle(s, k));
    setPage(1);
  }
  function toggleList(l: Category) {
    setLists((s) => toggle(s, l));
    setPage(1);
  }
  function onSearch(v: string) {
    setQ(v);
    setPage(1);
  }

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
    <div className="mx-auto max-w-[960px]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => {
          const active = kinds.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleKind(k)}
              className={`stamp transition-opacity duration-150 ${active ? TONE_TEXT[eventTone(k)] : "text-ink-3 opacity-40"}`}
            >
              {eventLabel(k)} <span className="text-ink-3">{fmtInt(counts[k] ?? 0)}</span>
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-rule" aria-hidden />
        {LISTS.map((l) => {
          const active = lists.has(l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => toggleList(l)}
              className={`stamp transition-opacity duration-150 ${active ? (l === "scheduled" ? "text-ink" : "text-mint") : "text-ink-3 opacity-40"}`}
            >
              {l === "scheduled" ? "Scheduled" : "Non-scheduled"}
            </button>
          );
        })}
        <input
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="reg, operator, type…"
          className="mono ml-auto w-full max-w-[220px] border border-rule-2 bg-paper px-3 py-1.5 text-xs placeholder:text-ink-3 focus:border-ink focus:outline-none"
        />
      </div>
      <p className="mono mb-5 text-[11px] text-ink-3">
        Exact dates come from DGCA registration reports; other changes are bracketed between two list snapshots.
      </p>

      {loadError ? (
        <p className="border-t border-rule py-10 text-center text-sm text-ink-3">Could not load the event log.</p>
      ) : loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <p className="border-t border-rule py-10 text-center text-sm text-ink-3">No events match these filters.</p>
      ) : (
        <div>
          {groups.map(([key, rows]) => {
            const snaps = rows.filter((e) => e.kind === "snapshot");
            const rest = rows.filter((e) => e.kind !== "snapshot");
            return (
              <div key={key} className="mt-6 first:mt-0">
                <div className="mb-1 flex items-center gap-3">
                  <span className="stencil whitespace-nowrap text-sm">{monthLabel(key)}</span>
                  <span className="mono whitespace-nowrap text-[11px] text-ink-3">{fmtInt(rows.length)} events</span>
                  <span className="threshold flex-1" aria-hidden />
                </div>
                {snaps.length > 0 && (
                  <div className="mb-1 border-b border-rule pb-1">
                    {snaps.map((e) => (
                      <div key={e.id} className="mono py-0.5 text-[11px] text-ink-3">
                        <span className="text-ink-2">Snapshot</span> · {fmtDate(e.date)} · {e.list} {e.note}
                      </div>
                    ))}
                  </div>
                )}
                {rest.map((e) => (
                  <div
                    key={e.id}
                    className="row-hover flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-1 py-2 text-[13px] last:border-b-0"
                  >
                    <DateCell e={e} />
                    <Stamp tone={eventTone(e.kind)} className="shrink-0">
                      {eventLabel(e.kind)}
                    </Stamp>
                    {e.reg ? (
                      <Link href={`/aircraft/${e.reg}`} className={`mono shrink-0 ${REG_W} text-ink hover:text-signal`}>
                        {e.reg}
                      </Link>
                    ) : (
                      <span className={`mono shrink-0 ${REG_W} text-ink-3`}>—</span>
                    )}
                    <span className="min-w-[240px] flex-1 text-ink-2">{eventProse(e)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !loadError && filtered.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="mono text-[11px] text-ink-2">
            {fmtInt(filtered.length)} events · page {clampedPage} of {pageCount}
          </span>
          <LogPager page={clampedPage} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="space-y-2 border-t border-rule pt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`${styles.skeletonBar} h-4 bg-paper-3`} style={{ width: `${72 - (i % 4) * 8}%` }} />
      ))}
    </div>
  );
}
