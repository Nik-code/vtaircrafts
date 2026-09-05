"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IndexRecord } from "@/lib/types";
import { thumb } from "@/lib/format";
import { Silhouette } from "@/components/AircraftPhoto";
import { Tag } from "@/components/Tag";

type SortKey = "reg" | "operator" | "type" | "seats" | "first";
type View = "log" | "cards";

interface Filters {
  q: string;
  o: string[];   // operator ids
  c: string[];   // S / N
  w: string[];   // FW / RW / B
  mf: string[];  // manufacturers
  t: string[];   // type names
  ro: string[];  // roles
  img: boolean;  // has photo
}

const EMPTY: Filters = { q: "", o: [], c: [], w: [], mf: [], t: [], ro: [], img: false };
const PAGE = 90;

function readParams(): { f: Filters; sort: SortKey; view: View } {
  if (typeof window === "undefined") return { f: EMPTY, sort: "reg", view: "log" };
  const p = new URLSearchParams(window.location.search);
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(",").filter(Boolean) : []);
  return {
    f: { q: p.get("q") ?? "", o: list("o"), c: list("c"), w: list("w"), mf: list("mf"), t: list("t"), ro: list("ro"), img: p.get("img") === "1" },
    sort: (p.get("sort") as SortKey) || "reg",
    view: (p.get("view") as View) || "log",
  };
}

function writeParams(f: Filters, sort: SortKey, view: View) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const k of ["o", "c", "w", "mf", "t", "ro"] as const) if (f[k].length) p.set(k, f[k].join(","));
  if (f.img) p.set("img", "1");
  if (sort !== "reg") p.set("sort", sort);
  if (view !== "log") p.set("view", view);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function matches(a: IndexRecord, q: string) {
  if (!q) return true;
  const n = q.toUpperCase().replace(/\s+/g, " ").trim();
  const regQ = n.replace(/^VT-?/, "");
  if (a.r.replace("VT-", "").startsWith(regQ) && /^[A-Z]{1,3}$/.test(regQ)) return true;
  const hay = `${a.r} ${a.r.replace("-", "")} ${a.h ?? ""} ${a.on} ${a.m} ${a.t} ${a.ti ?? ""} ${a.mf}`.toUpperCase();
  return n.split(" ").every((tok) => hay.includes(tok));
}

export function FleetExplorer({ data }: { data: IndexRecord[] }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<SortKey>("reg");
  const [view, setView] = useState<View>("log");
  const [limit, setLimit] = useState(PAGE);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = readParams();
    setF(s.f); setSort(s.sort); setView(s.view); setReady(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (ready) { writeParams(f, sort, view); setLimit(PAGE); } }, [f, sort, view, ready]);

  const filtered = useMemo(() => {
    const out = data.filter((a) =>
      matches(a, f.q) &&
      (!f.o.length || f.o.includes(a.o)) &&
      (!f.c.length || f.c.includes(a.c)) &&
      (!f.w.length || f.w.includes(a.w)) &&
      (!f.mf.length || f.mf.includes(a.mf)) &&
      (!f.t.length || f.t.includes(a.t)) &&
      (!f.ro.length || f.ro.includes(a.ro)) &&
      (!f.img || !!a.i),
    );
    const cmp: Record<SortKey, (x: IndexRecord, y: IndexRecord) => number> = {
      reg: (x, y) => x.r.localeCompare(y.r),
      operator: (x, y) => x.on.localeCompare(y.on) || x.r.localeCompare(y.r),
      type: (x, y) => x.t.localeCompare(y.t) || x.r.localeCompare(y.r),
      seats: (x, y) => (y.s ?? -1) - (x.s ?? -1) || x.r.localeCompare(y.r),
      first: (x, y) => y.f.localeCompare(x.f) || x.r.localeCompare(y.r),
    };
    return out.sort(cmp[sort]);
  }, [data, f, sort]);

  const facet = (key: (a: IndexRecord) => string, label?: (k: string) => string) => {
    const m = new Map<string, number>();
    for (const a of filtered) { const k = key(a); m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ k, n, label: label ? label(k) : k }));
  };
  const opNames = useMemo(() => new Map(data.map((a) => [a.o, a.on])), [data]);
  const facets = {
    c: facet((a) => a.c, (k) => (k === "S" ? "Scheduled" : "Non-scheduled")),
    w: facet((a) => a.w, (k) => ({ FW: "Fixed wing", RW: "Rotary wing", B: "Balloon" }[k] ?? k)),
    ro: facet((a) => a.ro),
    mf: facet((a) => a.mf),
    t: facet((a) => a.t),
    o: facet((a) => a.o, (k) => opNames.get(k) ?? k),
  };
  const toggle = (k: keyof Omit<Filters, "q" | "img">, v: string) =>
    setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const active = f.o.length + f.c.length + f.w.length + f.mf.length + f.t.length + f.ro.length + (f.img ? 1 : 0) + (f.q ? 1 : 0);
  const shown = filtered.slice(0, limit);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Filters */}
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="frame flex items-center gap-2 border border-line-strong bg-bg-elev px-3 focus-within:border-accent">
          <span className="mono text-accent">›</span>
          <input
            ref={inputRef}
            type="search"
            value={f.q}
            onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
            placeholder="VT-, hex, operator, type…"
            className="mono w-full bg-transparent py-2.5 text-sm placeholder:text-fg-dim focus:outline-none"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="label">{filtered.length.toLocaleString("en-IN")} results</div>
          {active > 0 && (
            <button onClick={() => setF(EMPTY)} className="label text-accent hover:underline">clear {active}</button>
          )}
        </div>
        <FacetGroup title="Category" items={facets.c} selected={f.c} onToggle={(v) => toggle("c", v)} />
        <FacetGroup title="Airframe" items={facets.w} selected={f.w} onToggle={(v) => toggle("w", v)} />
        <label className="label flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={f.img} onChange={(e) => setF((s) => ({ ...s, img: e.target.checked }))} className="accent-[var(--accent)]" />
          has photo
        </label>
        <FacetGroup title="Operator" items={facets.o} selected={f.o} onToggle={(v) => toggle("o", v)} max={12} />
        <FacetGroup title="Manufacturer" items={facets.mf} selected={f.mf} onToggle={(v) => toggle("mf", v)} max={10} />
        <FacetGroup title="Type" items={facets.t} selected={f.t} onToggle={(v) => toggle("t", v)} max={12} />
        <FacetGroup title="Role" items={facets.ro} selected={f.ro} onToggle={(v) => toggle("ro", v)} />
      </aside>

      {/* Results */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-1">
            {(["log", "cards"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`label px-2.5 py-1.5 ${view === v ? "bg-fg text-bg" : "border border-line hover:border-line-strong"}`}>{v}</button>
            ))}
          </div>
          <div className="label flex items-center gap-2">
            sort
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="mono border border-line bg-bg-elev px-2 py-1 text-xs text-fg focus:outline-none">
              <option value="reg">registration</option>
              <option value="operator">operator</option>
              <option value="type">type</option>
              <option value="seats">seats</option>
              <option value="first">newest on register</option>
            </select>
          </div>
        </div>

        {view === "log" ? (
          <div>
            <div className="logrow text-fg-dim" style={{ gridTemplateColumns: "6.5rem 4.5rem 1fr 1fr 3.5rem 3.5rem" }}>
              <span>REG</span><span>HEX</span><span>TYPE</span><span>OPERATOR</span><span className="text-right">SEATS</span><span className="text-right">CAT</span>
            </div>
            {shown.map((a) => (
              <Link key={a.r} href={`/aircraft/${a.r}`} className="logrow group" style={{ gridTemplateColumns: "6.5rem 4.5rem 1fr 1fr 3.5rem 3.5rem" }}>
                <span className="text-fg group-hover:text-accent">{a.r}</span>
                <span className="text-fg-dim">{a.h ?? "——"}</span>
                <span className="truncate text-fg-muted" title={a.m}>{a.t}<span className="text-fg-dim"> {a.ti ?? ""}</span></span>
                <span className="truncate text-fg-muted">{a.on}</span>
                <span className="text-right text-fg-muted">{a.s ?? (a.ro === "cargo" ? "CGO" : "—")}</span>
                <span className={`text-right ${a.c === "S" ? "text-accent" : "text-teal"}`}>{a.c === "S" ? "SCH" : "NSOP"}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((a) => (
              <Link key={a.r} href={`/aircraft/${a.r}`} className="group frame hairline overflow-hidden bg-bg-elev">
                <div className="aspect-[16/9] overflow-hidden">
                  {a.i ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb(a.i[0], 640)} alt={`${a.r} ${a.t}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="dotgrid grid h-full w-full place-items-center text-fg-dim"><Silhouette wing={a.w} className="h-1/3 w-1/3 opacity-60" /></div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="display text-2xl">{a.r}</div>
                    <div className="mono truncate text-xs text-fg-muted">{a.t} · {a.on}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Tag tone={a.c === "S" ? "accent" : "teal"}>{a.c === "S" ? "SCH" : "NSOP"}</Tag>
                    {a.i && a.i[1] > 0 && <Tag tone="dim">repr.</Tag>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {shown.length < filtered.length && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => setLimit((l) => l + PAGE)} className="label border border-line-strong px-4 py-2 hover:border-accent hover:text-accent">
              load {Math.min(PAGE, filtered.length - shown.length)} more · {filtered.length - shown.length} remaining
            </button>
          </div>
        )}
        {filtered.length === 0 && <div className="mono py-16 text-center text-sm text-fg-dim">no aircraft match</div>}
      </section>
    </div>
  );
}

function FacetGroup({ title, items, selected, onToggle, max = 6 }: { title: string; items: Array<{ k: string; n: number; label: string }>; selected: string[]; onToggle: (v: string) => void; max?: number }) {
  const [open, setOpen] = useState(false);
  const list = open ? items : items.slice(0, max);
  if (!items.length) return null;
  return (
    <div>
      <div className="label mb-2">{title}</div>
      <ul className="space-y-1">
        {list.map((it) => {
          const on = selected.includes(it.k);
          return (
            <li key={it.k}>
              <button onClick={() => onToggle(it.k)} className={`flex w-full items-center justify-between gap-2 py-0.5 text-left text-[13px] ${on ? "text-accent" : "text-fg-muted hover:text-fg"}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`inline-block h-2 w-2 border ${on ? "border-accent bg-accent" : "border-line-strong"}`} />
                  <span className="truncate">{it.label}</span>
                </span>
                <span className="mono text-[11px] text-fg-dim">{it.n}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > max && (
        <button onClick={() => setOpen((o) => !o)} className="label mt-1 text-fg-dim hover:text-fg">{open ? "less" : `+${items.length - max} more`}</button>
      )}
    </div>
  );
}
