"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Event, EventKind } from "@/lib/types";
import { Stamp, type StampTone } from "@/components/ui/Stamp";
import { Button } from "@/components/ui/Button";
import { fmtDate, fmtInt } from "@/lib/format";
import { eventLabel, eventProse, eventTone } from "./eventFormat";

const KINDS: EventKind[] = ["registered", "added", "moved", "removed", "deregistered", "owner-change", "snapshot"];
const LISTS: Category[] = ["scheduled", "non-scheduled"];
const PAGE_SIZE = 150;

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

function DateCell({ e }: { e: Event }) {
  if (e.date) return <span className="mono text-xs text-ink-2">{fmtDate(e.date)}</span>;
  if (e.from || e.to) {
    return (
      <span className="mono text-xs text-ink-2">
        <span className="label label-dim mr-1.5">between</span>
        {fmtDate(e.from)} → {fmtDate(e.to)}
      </span>
    );
  }
  return <span className="mono text-xs text-ink-3">—</span>;
}

function monthKeyOf(e: Event): string {
  const d = e.date ?? e.to ?? e.from;
  return d ? d.slice(0, 7) : "undated";
}

function monthLabel(key: string): string {
  if (key === "undated") return "Undated";
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function LogTimeline({ events }: { events: Event[] }) {
  const [kinds, setKinds] = useState<Set<EventKind>>(new Set(KINDS));
  const [lists, setLists] = useState<Set<Category>>(new Set(LISTS));
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const m = new Map<EventKind, number>();
    for (const e of events) m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
    return m;
  }, [events]);

  const filtered = useMemo(() => {
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

  const filterKey = `${q}|${[...kinds].sort().join(",")}|${[...lists].sort().join(",")}`;

  function toggleKind(k: EventKind) {
    setKinds((s) => toggle(s, k));
    setShown(PAGE_SIZE);
  }
  function toggleList(l: Category) {
    setLists((s) => toggle(s, l));
    setShown(PAGE_SIZE);
  }
  function onSearch(v: string) {
    setQ(v);
    setShown(PAGE_SIZE);
  }

  const visible = filtered.slice(0, shown);
  const groups = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of visible) {
      const key = monthKeyOf(e);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return [...m.entries()];
  }, [visible]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => {
          const active = kinds.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleKind(k)}
              className={`stamp transition-opacity duration-150 ${active ? TONE_TEXT[eventTone(k)] : "text-ink-3 opacity-40"}`}
            >
              {eventLabel(k)} <span className="text-ink-3">{fmtInt(counts.get(k) ?? 0)}</span>
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

      {filtered.length === 0 ? (
        <p className="border-t border-rule py-10 text-center text-sm text-ink-3">No events match these filters.</p>
      ) : (
        <div key={filterKey}>
          {groups.map(([key, rows]) => (
            <div key={key} className="rise">
              <div className="stencil sticky top-12 z-10 border-y border-ink bg-paper px-1 py-1.5 text-sm">{monthLabel(key)}</div>
              <div>
                {rows.map((e) => (
                  <div
                    key={e.id}
                    className="row-hover grid grid-cols-[7.5rem_auto_1fr] items-baseline gap-x-3 gap-y-1 border-b border-rule px-1 py-2.5 sm:grid-cols-[8rem_6.5rem_5.5rem_1fr]"
                  >
                    <DateCell e={e} />
                    <span><Stamp tone={eventTone(e.kind)}>{eventLabel(e.kind)}</Stamp></span>
                    <span className="hidden sm:block">
                      {e.reg ? (
                        <Link href={`/aircraft/${e.reg}`} className="mono text-xs text-ink hover:text-signal">{e.reg}</Link>
                      ) : (
                        <span className="mono text-xs text-ink-3">—</span>
                      )}
                    </span>
                    <span className="col-span-2 text-sm text-ink-2 sm:col-span-1">
                      {e.reg && <span className="mono mr-1.5 text-xs sm:hidden">{e.reg}</span>}
                      {eventProse(e)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {shown < filtered.length && (
        <div className="mt-6 flex justify-center">
          <Button tone="ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Load more · {fmtInt(filtered.length - shown)} remaining
          </Button>
        </div>
      )}
    </div>
  );
}
