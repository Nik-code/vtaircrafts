"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type LogKind = "SNAPSHOT" | "ADDED" | "REMOVED" | "MOVED" | "NOTE";
export interface LogEntry { at: string; kind: LogKind; reg?: string; text: string; href?: string }

const COLOR: Record<LogKind, string> = {
  SNAPSHOT: "text-teal",
  ADDED: "text-accent",
  REMOVED: "text-red",
  MOVED: "text-lime",
  NOTE: "text-fg-dim",
};
const SIGIL: Record<LogKind, string> = { SNAPSHOT: "◆", ADDED: "+", REMOVED: "−", MOVED: "~", NOTE: "#" };

export function LogView({ entries }: { entries: LogEntry[] }) {
  const [kinds, setKinds] = useState<Set<LogKind>>(new Set(["SNAPSHOT", "ADDED", "REMOVED", "MOVED", "NOTE"]));
  const [q, setQ] = useState("");
  const counts = useMemo(() => entries.reduce<Record<string, number>>((m, e) => ((m[e.kind] = (m[e.kind] ?? 0) + 1), m), {}), [entries]);
  const shown = useMemo(() => {
    const n = q.trim().toUpperCase();
    return entries.filter((e) => kinds.has(e.kind) && (!n || `${e.reg ?? ""} ${e.text}`.toUpperCase().includes(n)));
  }, [entries, kinds, q]);
  const toggle = (k: LogKind) => setKinds((s) => { const t = new Set(s); if (t.has(k)) t.delete(k); else t.add(k); return t; });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(COLOR) as LogKind[]).map((k) => (
          <button key={k} onClick={() => toggle(k)} className={`label border px-2 py-1 ${kinds.has(k) ? `border-line-strong ${COLOR[k]}` : "border-line text-fg-dim line-through"}`}>
            {SIGIL[k]} {k} <span className="text-fg-dim">{counts[k] ?? 0}</span>
          </button>
        ))}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter…" className="mono ml-auto border border-line bg-bg-elev px-2 py-1 text-xs placeholder:text-fg-dim focus:border-accent focus:outline-none" />
      </div>
      <div className="frame hairline bg-[#07080a] p-3 sm:p-4">
        <div className="mono text-[12.5px] leading-6">
          {shown.map((e, i) => (
            <div key={i} className="grid grid-cols-[6rem_5.5rem_1fr] gap-3 border-b border-line/60 py-0.5 hover:bg-white/[0.02] sm:grid-cols-[6.5rem_6rem_6rem_1fr]">
              <span className="text-fg-dim">{e.at}</span>
              <span className={COLOR[e.kind]}>{SIGIL[e.kind]} {e.kind}</span>
              <span className="hidden sm:block">{e.reg && (e.href ? <Link href={e.href} className="text-fg hover:text-accent">{e.reg}</Link> : <span className="text-fg-muted">{e.reg}</span>)}</span>
              <span className="truncate text-fg-muted">{!e.reg ? "" : <span className="sm:hidden">{e.reg} · </span>}{e.text}</span>
            </div>
          ))}
          <div className="cursor pt-1 text-fg-dim">{shown.length} lines</div>
        </div>
      </div>
    </div>
  );
}
