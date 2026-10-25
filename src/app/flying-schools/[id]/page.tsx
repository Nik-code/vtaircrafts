import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraftByReg, getArchivedByReg, getOperator, getTraining } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Container, SectionHeader } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

const SECTION: Record<string, string> = { SE: "Single engine", ME: "Multi engine", LSA: "Light sport", HELI: "Helicopter" };

function getFto(id: string) {
  return getTraining()?.ftos.find((f) => f.id === id);
}

export function generateStaticParams() {
  return (getTraining()?.ftos ?? []).map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: PageProps<"/flying-schools/[id]">): Promise<Metadata> {
  const { id } = await params;
  const f = getFto(id);
  if (!f) return { title: id };
  const types = [...new Set(f.aircraft.map((a) => a.type.name))].slice(0, 3).join(", ");
  return {
    title: `${f.name}: flying school fleet`,
    description: `${f.name} is a DGCA-approved flying training organisation with ${f.aircraft.length} aircraft (${types}). Approval ${f.approvalNo ?? ""}, valid until ${fmtDate(f.validUntil)}.`,
    alternates: { canonical: `/flying-schools/${f.id}` },
  };
}

export default async function FlyingSchoolPage({ params }: PageProps<"/flying-schools/[id]">) {
  const { id } = await params;
  const f = getFto(id);
  if (!f) notFound();
  const t = getTraining()!;
  const operator = getOperator(f.id);
  const byType = new Map<string, typeof f.aircraft>();
  for (const a of f.aircraft) byType.set(a.type.name, [...(byType.get(a.type.name) ?? []), a]);
  const types = [...byType.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={[
          breadcrumbs([
            ["Flying schools", "/flying-schools"],
            [f.name, `/flying-schools/${f.id}`],
          ]),
          { "@context": "https://schema.org", "@type": "EducationalOrganization", name: f.name },
        ]}
      />
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/flying-schools" className="hover:text-fg">Flying schools</Link>
        </nav>
        <header>
          <h1 className="h1">{f.name}</h1>
          <p className="lede mt-4 max-w-[64ch]">
            A flying training organisation approved by DGCA, listing {fmtInt(f.aircraft.length)} aircraft as on {fmtDate(t.asOn)}.
            {operator && (
              <>
                {" "}It also holds a non-scheduled operator permit:{" "}
                <Link href={`/operators/${operator.id}`} className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                  {operator.name}
                </Link>
                .
              </>
            )}
          </p>
        </header>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Field label="Approval">
            <span className="mono">{f.approvalNo ?? "—"}</span>
          </Field>
          <Field label="Valid until">{fmtDate(f.validUntil)}</Field>
          <Field label="Ownership">{f.ownership ?? "—"}</Field>
          <Field label="Stated fleet">
            {f.singleEngine ?? 0} single, {f.multiEngine ?? 0} multi engine
          </Field>
          <Field label={f.bases.length === 1 ? "Base" : "Bases"} className="col-span-2 sm:col-span-4">
            <ul className="space-y-1">
              {f.bases.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Field>
          {f.remarks && (
            <Field label="Remarks" className="col-span-2 sm:col-span-4">
              {f.remarks}
            </Field>
          )}
        </dl>

        <section className="mt-16">
          <SectionHeader title="Aircraft" meta={`${fmtInt(f.aircraft.length)}`} />
          <div className="space-y-8">
            {types.map(([name, list]) => (
              <div key={name}>
                <h3 className="mb-3 flex items-baseline gap-2 text-[15px] font-medium">
                  {name}
                  <span className="num text-fg-3">{fmtInt(list.length)}</span>
                  <span className="text-[13px] font-normal text-fg-3">{[...new Set(list.map((a) => SECTION[a.section] ?? a.section))].join(", ")}</span>
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {list.map((a) => {
                    const hasPage = getAircraftByReg(a.reg) || getArchivedByReg(a.reg);
                    return (
                      <li key={`${a.reg}|${a.section}`}>
                        {hasPage ? (
                          <Link href={`/aircraft/${a.reg}`} className="chip mono">
                            {a.reg}
                          </Link>
                        ) : (
                          <span className="chip mono">{a.reg}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-fg-3">
            As printed in DGCA&rsquo;s{" "}
            <a href={t.source.url} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-fg">
              flying training organisations list
            </a>
            , page {f.page}.
          </p>
        </section>
      </Container>
    </main>
  );
}
