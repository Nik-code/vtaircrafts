import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { getLessorLeague } from "@/lib/registry";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Aircraft lessors and owners in India",
  description:
    "Who owns the aircraft Indian airlines fly: SMBC, Avolon, AerCap, Air Lease, BOC Aviation, Jackson Square and other lessors, with the operators and tails behind each, from DGCA registration reports.",
  alternates: { canonical: "/owners" },
};

export default function OwnersPage() {
  const league = getLessorLeague();
  const meta = getMeta();
  const total = league.reduce((n, o) => n + o.owned.length, 0);

  return (
    <main className="py-10 sm:py-14">
      <JsonLd data={breadcrumbs([["Owners", "/owners"]])} />
      <Container>
        <PageHeader
          eyebrow={`From DGCA registration reports · fleet as on ${fmtDate(meta.snapshot)}`}
          title="Owners and lessors"
          lede="The registered owner and lessor DGCA records for each aircraft on an operator permit today, excluding operators that own their own aircraft. Leasing companies register through numbered special purpose companies; these are grouped where the family is clear from the name."
        />

        <section className="mt-14">
          <SectionHeader title="Lessors and owners" meta={`${fmtInt(league.length)} names · ${fmtInt(total)} aircraft owned`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-fg-3">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 text-right font-medium">Owner of</th>
                  <th className="py-2 pr-4 text-right font-medium">Lessor of</th>
                  <th className="py-2 font-medium">Operators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {league.map((o) => (
                  <tr key={o.slug}>
                    <td className="py-3 pr-4">
                      <Link href={`/owners/${o.slug}`} className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                        {o.name}
                      </Link>
                    </td>
                    <td className="num py-3 pr-4 text-right font-medium">{o.owned.length ? fmtInt(o.owned.length) : "—"}</td>
                    <td className="num py-3 pr-4 text-right">{o.leased.length ? fmtInt(o.leased.length) : "—"}</td>
                    <td className="py-3 text-[14px] text-fg-2">
                      {o.operators.slice(0, 3).map((x) => x.name).join(", ")}
                      {o.operators.length > 3 && <span className="text-fg-3"> and {o.operators.length - 3} more</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-fg-3">
            &ldquo;Owner of&rdquo; is the registered owner on the certificate of registration. &ldquo;Lessor of&rdquo; counts aircraft where DGCA
            names this company as lessor and someone else as owner. A trustee such as Wilmington Trust holds title on behalf of an investor
            that is not named. Not every aircraft has an owner on record.
          </p>
        </section>
      </Container>
    </main>
  );
}
