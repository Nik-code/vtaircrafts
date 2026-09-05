import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getChanges, getOperator, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Dimension } from "@/components/ui/Dimension";
import { HatchBar } from "@/components/ui/Hatch";
import { Plate } from "@/components/ui/Plate";
import { Silhouette } from "@/components/ui/Silhouette";
import { Stamp } from "@/components/ui/Stamp";
import { TitleBlock } from "@/components/ui/TitleBlock";
import type { Wing } from "@/lib/types";

export function generateStaticParams() {
  return getOperators().map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: PageProps<"/operators/[id]">): Promise<Metadata> {
  const { id } = await params;
  const o = getOperator(id);
  return {
    title: o ? o.name : id,
    description: o ? `${o.fleetCount} aircraft on the DGCA list for ${o.name} (${o.legalName}).` : undefined,
  };
}

export default async function OperatorPage({ params }: PageProps<"/operators/[id]">) {
  const { id } = await params;
  const operator = getOperator(id);
  if (!operator) notFound();

  const fleet = getAircraft().filter((a) => a.operatorId === operator.id);
  const hero = fleet.find((a) => a.reg === operator.heroReg) ?? fleet.find((a) => a.image) ?? fleet[0] ?? null;
  const added = new Set(getChanges()?.added.filter((c) => c.operatorId === operator.id).map((c) => c.reg) ?? []);
  const scheduled = operator.category === "scheduled";
  const maxType = operator.types.reduce((n, t) => Math.max(n, t.count), 0) || 1;
  const byType = operator.types.map((t) => ({
    ...t,
    regs: fleet.filter((a) => a.type.name === t.name).sort((x, y) => x.reg.localeCompare(y.reg)),
  }));

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <nav className="label mb-3 flex items-center gap-2">
        <Link href="/operators" className="underline-offset-2 hover:underline">Operators</Link>
        <span aria-hidden>/</span>
        <span>{scheduled ? "Scheduled" : "Non-scheduled"}</span>
      </nav>

      <TitleBlock
        sheet="04"
        title={operator.name}
        fields={[
          { label: "Permit", value: operator.permit.no ?? "—" },
          { label: "Valid to", value: fmtDate(operator.permit.validUntil) },
          { label: "List", value: scheduled ? "Scheduled" : "Non-scheduled" },
        ]}
      />

      <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Stamp tone={scheduled ? "ink" : "mint"}>{scheduled ? "Scheduled" : "Non-scheduled"}</Stamp>
            {operator.ops && <Stamp tone="dim">{operator.ops}</Stamp>}
          </div>
          <p className="mt-3 text-sm text-ink-2">{operator.legalName}</p>
          {operator.website && (
            <a href={operator.website} target="_blank" rel="noreferrer" className="mono mt-1 inline-block text-xs text-ink-3 underline-offset-2 hover:text-ink hover:underline">
              {operator.website.replace(/^https?:\/\//, "")} ↗
            </a>
          )}

          <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-6">
            <Stat label="Aircraft" tone="signal" value={fmtInt(operator.fleetCount)} />
            <Stat label="Seats on the list" value={fmtInt(operator.seatsTotal)} />
            <Stat label="Types" value={fmtInt(operator.types.length)} />
            <div>
              <Dimension>Airframes</Dimension>
              <ul className="mt-2 space-y-1.5">
                {(["FW", "RW", "B"] as Wing[])
                  .filter((w) => operator.wings[w] > 0)
                  .map((w) => (
                    <li key={w} className="flex items-center gap-2">
                      <Silhouette wing={w} className="h-5 w-9 shrink-0 text-ink-3" strokeWidth={2.2} />
                      <span className="display-num text-xl">{operator.wings[w]}</span>
                      <span className="label label-dim">{w === "FW" ? "Fixed" : w === "RW" ? "Rotary" : "Balloon"}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        <div>
          {hero ? (
            <Plate
              image={hero.image}
              wing={hero.wing}
              alt={`${hero.reg}, ${hero.type.name}, ${operator.name}`}
              width={1280}
              aspect="aspect-[16/9]"
              eager
              fig="01"
              caption={
                <Link href={`/aircraft/${hero.reg}`} className="mono text-[13px] underline-offset-2 hover:underline">
                  {hero.reg} · {hero.type.name}
                </Link>
              }
            />
          ) : null}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
          <span aria-hidden className="h-1.5 w-1.5 bg-signal" />
          <h2 className="stencil text-lg">Type mix</h2>
          <span className="mono ml-auto text-[11px] text-ink-2">{operator.types.length} types</span>
        </div>
        <ul className="mt-4 space-y-3">
          {operator.types.map((t) => (
            <li key={t.name}>
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 truncate text-sm">{t.name}</span>
                {t.icao && <Stamp tone="dim">{t.icao}</Stamp>}
                <span className="mono ml-auto text-[12px]">{fmtInt(t.count)}</span>
              </div>
              <HatchBar ratio={t.count / maxType} tone={scheduled ? "ink" : "mint"} height={12} className="mt-1.5" />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
          <span aria-hidden className="h-1.5 w-1.5 bg-rule-2" />
          <h2 className="stencil text-lg">Fleet</h2>
          <span className="mono ml-auto text-[11px] text-ink-2">{fmtInt(fleet.length)} registrations</span>
        </div>
        <div className="mt-5 space-y-7">
          {byType.map((t) => (
            <div key={t.name}>
              <div className="mb-2 flex items-baseline gap-2 border-b border-rule pb-1.5">
                <h3 className="text-[15px]">{t.name}</h3>
                {t.icao && <Stamp tone="dim">{t.icao}</Stamp>}
                <span className="mono ml-auto text-[11px] text-ink-3">{fmtInt(t.count)}</span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {t.regs.map((a) => (
                  <li key={a.reg}>
                    <Link
                      href={`/aircraft/${a.reg}`}
                      className={`mono inline-flex items-center gap-1 border px-2 py-1 text-[12px] transition-colors duration-150 hover:border-signal hover:text-signal ${
                        a.image?.tier === "exact" ? "border-ink text-ink" : "border-rule text-ink-2"
                      }`}
                    >
                      {a.reg}
                      {added.has(a.reg) && <span className="text-signal" title="Added on the latest list">+</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, tone = "ink" }: { label: string; value: string; tone?: "ink" | "signal" }) {
  return (
    <div>
      <Dimension tone={tone}>{label}</Dimension>
      <div className={`display-num mt-2 text-4xl sm:text-5xl ${tone === "signal" ? "text-signal" : ""}`}>{value}</div>
    </div>
  );
}
