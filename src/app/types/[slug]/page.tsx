import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnrichment } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { ageOf, builtYear, getType, getTypes } from "@/lib/registry";
import { Bar } from "@/components/ui/Bar";
import { Container, SectionHeader } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { Photo, PhotoCredit } from "@/components/ui/Photo";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

const ENGINE_KIND = { jet: "jet", turboprop: "turboprop", piston: "piston", electric: "electric" } as const;
const WAKE = { L: "Light", M: "Medium", H: "Heavy", J: "Super" } as const;

export function generateStaticParams() {
  return getTypes().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/types/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = getType(slug);
  if (!t) return { title: slug };
  const ops = t.operators.slice(0, 3).map((o) => `${o.name} ${o.count}`).join(", ");
  return {
    title: `${t.name} in India: ${t.aircraft.length} aircraft`,
    description: `${t.aircraft.length} ${t.name} aircraft are on Indian operator permits (${ops}${t.operators.length > 3 ? ", and others" : ""})${
      t.age.mean != null ? `, average age ${t.age.mean.toFixed(1)} years` : ""
    }. Every registration with owner, build year and history.`,
    alternates: { canonical: `/types/${t.slug}` },
  };
}

export default async function TypePage({ params }: PageProps<"/types/[slug]">) {
  const { slug } = await params;
  const t = getType(slug);
  if (!t) notFound();
  const hero = t.aircraft.find((a) => a.image?.tier === "exact") ?? t.aircraft.find((a) => a.image) ?? null;
  const maxOp = t.operators[0]?.count ?? 1;
  const years = t.aircraft.map((a) => builtYear(a)?.year).filter((y): y is number => y != null);
  const firstReg = t.aircraft
    .map((a) => a.history?.registeredOn)
    .filter((d): d is string => !!d)
    .sort()[0];
  const spec = t.spec;

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={breadcrumbs([
          ["Types", "/types"],
          [t.name, `/types/${t.slug}`],
        ])}
      />
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/types" className="hover:text-fg">Types</Link>
          <span aria-hidden>/</span>
          <span>{t.manufacturer}</span>
        </nav>

        <header>
          <h1 className="h1">{t.name} in India</h1>
          <p className="lede mt-4 max-w-[64ch]">
            {fmtInt(t.aircraft.length)} on Indian operator permits today, with {fmtInt(t.operators.length)}{" "}
            {t.operators.length === 1 ? "operator" : "operators"}
            {t.archived.length > 0 && <>; {fmtInt(t.archived.length)} more appear in older DGCA records</>}.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 content-start">
            <Field label="Manufacturer">{t.manufacturer}</Field>
            <Field label="ICAO designator">
              <span className="mono">{t.icao ?? "—"}</span>
            </Field>
            <Field label="Family">{t.family}</Field>
            {spec?.engines != null && (
              <Field label="Engines">
                {spec.engines} {spec.engineKind ? ENGINE_KIND[spec.engineKind] : ""}
              </Field>
            )}
            {spec?.wake && <Field label="Wake category">{WAKE[spec.wake]}</Field>}
            {t.seats && <Field label="Seats on the list">{t.seats.min === t.seats.max ? t.seats.min : `${t.seats.min} to ${t.seats.max}`}</Field>}
            {t.age.mean != null && (
              <Field label="Average age">
                {t.age.mean.toFixed(1)} years
                <span className="mt-0.5 block text-[13px] text-fg-3">
                  {t.age.known === t.age.total ? "All aircraft" : `${fmtInt(t.age.known)} of ${fmtInt(t.age.total)} with a known build year`}
                </span>
              </Field>
            )}
            {years.length > 0 && (
              <Field label="Build years">
                {Math.min(...years)} to {Math.max(...years)}
              </Field>
            )}
            {firstReg && <Field label="Earliest registration on file">{fmtDate(firstReg)}</Field>}
          </dl>
          {hero && (
            <div>
              <Link href={`/aircraft/${hero.reg}`} className="group block">
                <Photo image={hero.image} wing={hero.wing} alt={`${hero.reg}, ${t.name}`} width={1280} aspect="aspect-[16/10]" eager className="transition-opacity group-hover:opacity-90" />
                <p className="mt-3 text-[15px] text-fg-2">
                  <span className="mono font-medium text-fg">{hero.reg}</span> · {hero.operator}
                </p>
              </Link>
              {hero.image && <PhotoCredit image={hero.image} className="mt-1" />}
            </div>
          )}
        </div>

        <section className="mt-16">
          <SectionHeader title="Operators" meta={`${fmtInt(t.operators.length)}`} />
          <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {t.operators.map((o) => (
              <li key={o.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/operators/${o.id}`} className="text-[15px] underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                    {o.name}
                  </Link>
                  <span className="num text-[15px] font-medium">{fmtInt(o.count)}</span>
                </div>
                <Bar ratio={o.count / maxOp} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>

        {t.engines.length > 1 && (
          <section className="mt-16">
            <SectionHeader title="Engines" />
            <ul className="divide-y divide-line">
              {t.engines.map((e) => (
                <li key={e.name} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-[15px]">{e.name}</span>
                  <span className="num text-[15px] font-medium">{fmtInt(e.count)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-fg-3">Read from the model number DGCA prints for each aircraft.</p>
          </section>
        )}

        <section className="mt-16">
          <SectionHeader title="Aircraft" meta={`${fmtInt(t.aircraft.length)} registrations`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-fg-3">
                  <th className="py-2 pr-4 font-medium">Registration</th>
                  <th className="py-2 pr-4 font-medium">Operator</th>
                  <th className="py-2 pr-4 font-medium">Model</th>
                  <th className="py-2 pr-4 text-right font-medium">Built</th>
                  <th className="py-2 text-right font-medium">Seats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {t.aircraft.map((a) => (
                  <tr key={a.reg}>
                    <td className="py-2.5 pr-4">
                      <Link href={`/aircraft/${a.reg}`} className="mono font-medium text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                        {a.reg}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-fg-2">{a.operator}</td>
                    <td className="py-2.5 pr-4 text-fg-2">{a.model}</td>
                    <td className="num py-2.5 pr-4 text-right text-fg-2" title={ageOf(a) != null ? `${ageOf(a)} years` : undefined}>
                      {builtYear(a)?.year ?? "—"}
                    </td>
                    <td className="num py-2.5 text-right text-fg-2">{a.seats ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.aircraft.some((a) => getEnrichment(a.reg)?.builtYear && !a.history?.yearOfManufacture) && (
            <p className="mt-3 text-[13px] text-fg-3">Build years come from DGCA registration reports, and from VRS standing-data where DGCA has none.</p>
          )}
        </section>

        {t.archived.length > 0 && (
          <section className="mt-16">
            <SectionHeader title="Former Indian aircraft" meta={`${fmtInt(t.archived.length)} no longer on a permit`} />
            <ul className="flex flex-wrap gap-2">
              {t.archived.map((h) => (
                <li key={h.reg}>
                  <Link href={`/aircraft/${h.reg}`} className="chip mono">
                    {h.reg}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </main>
  );
}
