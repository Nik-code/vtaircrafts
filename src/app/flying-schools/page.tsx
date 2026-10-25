import type { Metadata } from "next";
import Link from "next/link";
import { getTraining } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Flying schools in India and their aircraft",
  description:
    "Every DGCA-approved flying training organisation in India with its bases, approval and full training fleet: Cessna 172s and 152s, Diamond DA40 and DA42, Piper Archers, Tecnams and more.",
  alternates: { canonical: "/flying-schools" },
};

export default function FlyingSchoolsPage() {
  const t = getTraining();
  const ftos = t ? [...t.ftos].sort((a, b) => b.aircraft.length - a.aircraft.length || a.name.localeCompare(b.name)) : [];
  const total = ftos.reduce((n, f) => n + f.aircraft.length, 0);
  const types = new Map<string, number>();
  for (const f of ftos) for (const a of f.aircraft) types.set(a.type.name, (types.get(a.type.name) ?? 0) + 1);

  return (
    <main className="py-10 sm:py-14">
      <JsonLd data={breadcrumbs([["Flying schools", "/flying-schools"]])} />
      <Container>
        <PageHeader
          eyebrow={t ? `DGCA FTO list · as on ${fmtDate(t.asOn)}` : undefined}
          title="Flying schools"
          lede="Flying training organisations approved by DGCA, with every aircraft each one lists. These trainers hold no operator permit, so they sit outside the airline and charter lists."
        />

        <dl className="mt-12 grid grid-cols-2 border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
          {[
            ["Organisations", fmtInt(ftos.length)],
            ["Aircraft", fmtInt(total)],
            ["Types", fmtInt(types.size)],
          ].map(([label, value]) => (
            <div key={label} className="px-1 py-6 sm:px-6">
              <dt className="text-[13px] font-medium text-fg-3">{label}</dt>
              <dd className="display mt-1 text-[clamp(32px,5vw,44px)]">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-14">
          <SectionHeader title="Organisations" meta="largest fleets first" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-fg-3">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Ownership</th>
                  <th className="py-2 pr-4 text-right font-medium">Aircraft</th>
                  <th className="py-2 text-right font-medium">Approval valid until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ftos.map((f) => (
                  <tr key={f.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/flying-schools/${f.id}`} className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                        {f.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-[14px] text-fg-2">{f.ownership ?? "—"}</td>
                    <td className="num py-3 pr-4 text-right font-medium">{fmtInt(f.aircraft.length)}</td>
                    <td className="num py-3 text-right text-fg-2">{fmtDate(f.validUntil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader title="Training fleet by type" />
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {[...types.entries()]
              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
              .map(([name, n]) => (
                <li key={name} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
                  <span className="text-[15px]">{name}</span>
                  <span className="num text-[15px] font-medium">{fmtInt(n)}</span>
                </li>
              ))}
          </ul>
          {t && (
            <p className="mt-4 text-[13px] text-fg-3">
              Types are read from the model each organisation prints. Source:{" "}
              <a href={t.source.url} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-fg">
                DGCA flying training organisations list
              </a>
              .
            </p>
          )}
        </section>
      </Container>
    </main>
  );
}
