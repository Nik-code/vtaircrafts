import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getChanges, getOperator, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { AircraftPhoto } from "@/components/AircraftPhoto";
import { ImageCredit } from "@/components/ImageCredit";
import { DotMatrix } from "@/components/DotMatrix";
import { StatTile } from "@/components/StatTile";
import { Tag } from "@/components/Tag";

export function generateStaticParams() {
  return getOperators().map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: PageProps<"/operators/[id]">): Promise<Metadata> {
  const { id } = await params;
  const o = getOperator(id);
  return { title: o ? `${o.name} fleet` : id, description: o ? `${o.fleetCount} aircraft operated by ${o.name} (${o.legalName}).` : undefined };
}

export default async function OperatorPage({ params }: PageProps<"/operators/[id]">) {
  const { id } = await params;
  const o = getOperator(id);
  if (!o) notFound();
  const fleet = getAircraft().filter((a) => a.operatorId === o.id);
  const hero = fleet.find((a) => a.reg === o.heroReg) ?? null;
  const changes = getChanges();
  const added = new Set(changes?.added.filter((c) => c.operatorId === o.id).map((c) => c.reg));
  const byType = o.types.map((t) => ({ ...t, regs: fleet.filter((a) => a.type.name === t.name).sort((x, y) => x.reg.localeCompare(y.reg)) }));

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="label mb-4 flex items-center gap-2">
        <Link href="/operators" className="hover:text-fg">Operators</Link><span className="text-fg-dim">/</span><span className="text-fg">{o.name}</span>
      </div>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Tag tone={o.category === "scheduled" ? "accent" : "teal"}>{o.category === "scheduled" ? "Scheduled operator" : "Non-scheduled operator"}</Tag>
            {o.ops && <Tag>{o.ops}</Tag>}
          </div>
          <h1 className="display text-[clamp(44px,7vw,88px)]">{o.name}</h1>
          <div className="mt-2 text-fg-muted">{o.legalName}</div>
          {o.website && <a href={o.website} target="_blank" rel="noreferrer" className="mono mt-1 inline-block text-xs text-fg-dim hover:text-fg">{o.website.replace(/^https?:\/\//, "")} ↗</a>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatTile label="Aircraft" value={o.fleetCount} sub={o.statedCount == null ? "as parsed from DGCA list" : o.statedCount !== o.fleetCount ? `DGCA states ${o.statedCount}` : "matches DGCA count"} accent="orange" />
            <StatTile label="Seats" value={fmtInt(o.seatsTotal)} sub={`${o.wings.FW} fixed · ${o.wings.RW} rotary${o.wings.B ? ` · ${o.wings.B} balloon` : ""}`} />
          </div>
          <div className="mono mt-4 text-xs text-fg-dim">{o.category === "scheduled" ? "AOC" : "AOP"} {o.permit.no ?? "—"} · valid until {fmtDate(o.permit.validUntil)}</div>
        </div>
        <div className="frame hairline overflow-hidden bg-bg-elev">
          <div className="aspect-[16/9]">
            <AircraftPhoto image={hero?.image ?? null} wing={hero?.wing ?? "FW"} alt={o.name} width={1280} eager className="h-full w-full" />
          </div>
          {hero?.image && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <Link href={`/aircraft/${hero.reg}`} className="mono text-xs text-fg hover:text-accent">{hero.reg} · {hero.type.name}</Link>
              <ImageCredit image={hero.image} />
            </div>
          )}
        </div>
      </section>

      <section className="frame hairline dotgrid mt-10 bg-bg-elev p-5">
        <div className="label mb-4">Type mix</div>
        <DotMatrix items={o.types.slice(0, 16).map((t) => ({ label: t.icao ?? t.name, value: t.count, accent: o.category === "non-scheduled" }))} rows={14} />
      </section>

      <section className="mt-10 space-y-8">
        {byType.map((t) => (
          <div key={t.name}>
            <div className="mb-2 flex items-baseline justify-between border-b border-line pb-2">
              <h2 className="text-lg">{t.name} <span className="mono text-sm text-fg-dim">{t.icao ?? ""}</span></h2>
              <span className="mono text-xs text-fg-muted">{t.count}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.regs.map((a) => (
                <Link key={a.reg} href={`/aircraft/${a.reg}`} className={`mono border px-2 py-1 text-xs hover:border-accent hover:text-accent ${a.image?.tier === "exact" ? "border-line-strong text-fg" : "border-line text-fg-muted"}`}>
                  {a.reg}{added.has(a.reg) && <span className="ml-1 text-accent">+</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
