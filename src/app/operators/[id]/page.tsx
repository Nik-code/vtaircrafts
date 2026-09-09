import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getChanges, getOperator, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Bar } from "@/components/ui/Bar";
import { Badge, ListBadge } from "@/components/ui/Badge";
import { Container, SectionHeader } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { Photo, PhotoCredit } from "@/components/ui/Photo";
import { daysUntil } from "@/lib/format";

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
  const left = daysUntil(operator.permit.validUntil);
  const expiring = left != null && left <= 180;
  const wings = [
    operator.wings.FW && `${fmtInt(operator.wings.FW)} fixed wing`,
    operator.wings.RW && `${fmtInt(operator.wings.RW)} rotary wing`,
    operator.wings.B && `${fmtInt(operator.wings.B)} balloon`,
  ].filter(Boolean);

  return (
    <main className="py-10 sm:py-14">
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/operators" className="hover:text-fg">Operators</Link>
          <span aria-hidden>/</span>
          <span>{scheduled ? "Scheduled" : "Non-scheduled"}</span>
        </nav>

        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="h1">{operator.name}</h1>
            <ListBadge scheduled={scheduled} className="mt-1" />
          </div>
          <p className="mt-3 text-[17px] text-fg-2">
            {operator.legalName}
            {operator.website && (
              <>
                {" · "}
                <a href={operator.website} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-fg">
                  {operator.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </>
            )}
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[14px] font-medium text-fg-3">Aircraft</p>
                <p className="display mt-1 text-[48px]">{fmtInt(operator.fleetCount)}</p>
              </div>
              <div>
                <p className="text-[14px] font-medium text-fg-3">Types</p>
                <p className="display mt-1 text-[48px]">{fmtInt(operator.types.length)}</p>
              </div>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
              <Field label="Permit">
                <span className="mono">{operator.permit.no ?? "—"}</span>
              </Field>
              <Field label="Valid until">
                {fmtDate(operator.permit.validUntil)}
                {expiring && <Badge tone="danger" className="ml-2">Expiring</Badge>}
              </Field>
              {operator.ops && <Field label="Operations">{operator.ops}</Field>}
              <Field label="Airframes">{wings.join(", ")}</Field>
              {operator.seatsTotal > 0 && <Field label="Seats on the list">{fmtInt(operator.seatsTotal)}</Field>}
              {operator.statedCount != null && operator.statedCount !== operator.fleetCount && (
                <Field label="Stated by DGCA">{fmtInt(operator.statedCount)} aircraft</Field>
              )}
            </dl>
          </div>

          {hero && (
            <div>
              <Link href={`/aircraft/${hero.reg}`} className="group block">
                <Photo image={hero.image} wing={hero.wing} alt={`${hero.reg}, ${hero.type.name}, ${operator.name}`} width={1280} aspect="aspect-[16/10]" eager className="transition-opacity group-hover:opacity-90" />
                <p className="mt-3 text-[15px] text-fg-2">
                  <span className="mono font-medium text-fg">{hero.reg}</span> · {hero.type.name}
                </p>
              </Link>
              {hero.image && <PhotoCredit image={hero.image} className="mt-1" />}
            </div>
          )}
        </div>

        <section className="mt-16">
          <SectionHeader title="Type mix" />
          <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {operator.types.map((t) => (
              <li key={t.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-[15px]">{t.name}</span>
                    {t.icao && <span className="mono text-[13px] text-fg-3">{t.icao}</span>}
                  </span>
                  <span className="num text-[15px] font-medium">{fmtInt(t.count)}</span>
                </div>
                <Bar ratio={t.count / maxType} tone={scheduled ? "fg" : "teal"} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <SectionHeader
            title="Fleet"
            meta={`${fmtInt(fleet.length)} registrations`}
            action={
              <Link href={`/fleet?o=${operator.id}`} className="text-[15px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">
                Open in the fleet
              </Link>
            }
          />
          <div className="space-y-8">
            {byType.map((t) => (
              <div key={t.name}>
                <h3 className="mb-3 flex items-baseline gap-2 text-[15px] font-medium">
                  {t.name}
                  <span className="num text-fg-3">{fmtInt(t.count)}</span>
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {t.regs.map((a) => (
                    <li key={a.reg}>
                      <Link href={`/aircraft/${a.reg}`} className="chip mono">
                        {a.reg}
                        {added.has(a.reg) && <span className="text-accent" title="Added on the latest list">new</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
