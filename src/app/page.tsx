import Link from "next/link";
import { getAircraft, getChanges, getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { DotMatrix } from "@/components/DotMatrix";
import { StatTile } from "@/components/StatTile";
import { AircraftPhoto } from "@/components/AircraftPhoto";
import { Tag } from "@/components/Tag";
import { SearchBox } from "@/components/SearchBox";

export default function Home() {
  const meta = getMeta();
  const ops = getOperators();
  const aircraft = getAircraft();
  const changes = getChanges();
  const top = ops.slice(0, 14).map((o) => ({ label: o.name, value: o.fleetCount, href: `/operators/${o.id}`, accent: o.category === "non-scheduled" }));
  const manufacturers = Object.entries(
    aircraft.reduce<Record<string, number>>((m, a) => ((m[a.type.manufacturer] = (m[a.type.manufacturer] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);
  const featured = aircraft.filter((a) => a.image?.tier === "exact").sort((a, b) => (a.reg > b.reg ? 1 : -1));
  const pickFeatured = [0, 1, 2, 3, 4, 5].map((i) => featured[Math.floor((i * 97) % Math.max(1, featured.length))]).filter(Boolean);
  const asOn = meta.sources[0]?.asOn ?? meta.snapshot;

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <div className="label mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 bg-teal" />DGCA operator lists</span>
              <span className="text-fg-dim">/</span>
              <span>as on {fmtDate(asOn)}</span>
              <span className="text-fg-dim">/</span>
              <span className="cursor">live index</span>
            </div>
            <h1 className="display text-[clamp(64px,11vw,148px)] text-fg">
              {fmtInt(meta.counts.aircraft)}
              <span className="text-accent">.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-fg-muted">
              Every aircraft flying under an Indian scheduled or non-scheduled operator permit. Tail numbers,
              operators, types, seats and photos, rebuilt every month from the DGCA&apos;s own lists.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBox />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/fleet?c=S" className="label border border-line px-2.5 py-1.5 hover:border-line-strong hover:text-fg">
                Scheduled · {meta.counts.scheduled}
              </Link>
              <Link href="/fleet?c=N" className="label border border-line px-2.5 py-1.5 hover:border-line-strong hover:text-fg">
                Non-scheduled · {meta.counts.nonScheduled}
              </Link>
              <Link href="/fleet?w=RW" className="label border border-line px-2.5 py-1.5 hover:border-line-strong hover:text-fg">
                Helicopters · {meta.counts.rotary}
              </Link>
              <Link href="/fleet?w=B" className="label border border-line px-2.5 py-1.5 hover:border-line-strong hover:text-fg">
                Balloons · {meta.counts.balloons}
              </Link>
            </div>
          </div>
          <div className="frame frame-accent dotgrid hairline bg-bg-elev p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <div className="label">Fleet by operator</div>
              <div className="mono text-[11px] text-fg-dim">
                <span className="mr-3 inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-accent" />scheduled</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-teal" />non-scheduled</span>
              </div>
            </div>
            <DotMatrix items={top} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Operators" value={meta.counts.operators} sub={`${meta.sources.find((s) => s.category === "scheduled")?.operators ?? 0} scheduled · ${meta.sources.find((s) => s.category === "non-scheduled")?.operators ?? 0} non-scheduled`} accent="orange" />
          <StatTile label="Fixed wing" value={meta.counts.fixedWing} sub={`${manufacturers[0]?.[0]} leads with ${manufacturers[0]?.[1]}`} />
          <StatTile label="Rotary wing" value={meta.counts.rotary} sub="helicopters on NSOP permits" accent="teal" />
          <StatTile label="With photo" value={`${Math.round(((meta.counts.imagesExact + meta.counts.imagesOperatorType + meta.counts.imagesType) / meta.counts.aircraft) * 100)}%`} sub={`${meta.counts.imagesExact} exact tails from Wikimedia Commons`} />
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-[1400px] px-5 pb-12 sm:px-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="label">Photographed tails</h2>
          <Link href="/fleet" className="label hover:text-fg">Explore fleet →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pickFeatured.map((a) => (
            <Link key={a.reg} href={`/aircraft/${a.reg}`} className="group frame hairline overflow-hidden bg-bg-elev">
              <div className="aspect-[16/9] overflow-hidden">
                <AircraftPhoto image={a.image} wing={a.wing} alt={`${a.reg} ${a.type.name}`} width={1280} className="h-full w-full transition duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="display text-2xl">{a.reg}</div>
                  <div className="mono text-xs text-fg-muted">{a.type.name} · {a.operator}</div>
                </div>
                <Tag tone={a.category === "scheduled" ? "accent" : "teal"}>{a.category === "scheduled" ? "SCH" : "NSOP"}</Tag>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Manufacturers + log preview */}
      <section className="mx-auto grid max-w-[1400px] gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-2">
        <div className="frame hairline bg-bg-elev p-5">
          <div className="label mb-4">By manufacturer</div>
          <ul className="space-y-2">
            {manufacturers.slice(0, 10).map(([m, n]) => (
              <li key={m} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-36 truncate text-sm">{m}</span>
                  <span className="h-1.5 flex-1 bg-bg-panel">
                    <span className="block h-full bg-accent" style={{ width: `${(n / manufacturers[0][1]) * 100}%` }} />
                  </span>
                </div>
                <Link href={`/fleet?mf=${encodeURIComponent(m)}`} className="mono text-xs text-fg-muted hover:text-fg">{n}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="frame hairline bg-bg-elev p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="label">Log</div>
            <Link href="/log" className="label hover:text-fg">Full log →</Link>
          </div>
          <div className="mono text-[12.5px] leading-6 text-fg-muted">
            <div><span className="text-fg-dim">{meta.snapshot}</span> <span className="text-teal">SNAPSHOT</span> {meta.sources.map((s) => `${s.file} ${s.aircraft} regs`).join(" · ")}</div>
            {changes && (
              <>
                <div><span className="text-fg-dim">{changes.to}</span> <span className="text-accent">+{changes.added.length}</span> added since {changes.from} ({changes.scope.join(", ")})</div>
                <div><span className="text-fg-dim">{changes.to}</span> <span className="text-red">-{changes.removed.length}</span> removed since {changes.from}</div>
                {changes.added.slice(0, 5).map((c) => (
                  <div key={c.reg}><span className="text-fg-dim">{changes.to}</span> <span className="text-accent">+</span> <Link href={`/aircraft/${c.reg}`} className="text-fg hover:underline">{c.reg}</Link> {c.type} · {c.operator}</div>
                ))}
              </>
            )}
            <div className="cursor text-fg-dim">idle</div>
          </div>
        </div>
      </section>
    </main>
  );
}
