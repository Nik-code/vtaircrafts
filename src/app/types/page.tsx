import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { getTypes, type TypeGroup } from "@/lib/registry";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Aircraft types in India",
  description:
    "Every aircraft type on Indian airline and charter permits: how many of each, which operators fly them, average age and engines. Airbus A320neo, ATR 72, Boeing 737, helicopters and business jets.",
  alternates: { canonical: "/types" },
};

const GROUPS: Array<{ wing: TypeGroup["wing"]; title: string }> = [
  { wing: "FW", title: "Fixed wing" },
  { wing: "RW", title: "Helicopters" },
  { wing: "B", title: "Balloons" },
];

function TypeRows({ types }: { types: TypeGroup[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line text-[13px] text-fg-3">
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Manufacturer</th>
            <th className="py-2 pr-4 text-right font-medium">Aircraft</th>
            <th className="py-2 pr-4 text-right font-medium">Operators</th>
            <th className="py-2 text-right font-medium">Average age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {types.map((t) => (
            <tr key={t.slug}>
              <td className="py-3 pr-4">
                <Link href={`/types/${t.slug}`} className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                  {t.name}
                </Link>
                {t.icao && <span className="mono ml-2 text-[13px] text-fg-3">{t.icao}</span>}
              </td>
              <td className="py-3 pr-4 text-fg-2">{t.manufacturer}</td>
              <td className="num py-3 pr-4 text-right font-medium">{fmtInt(t.aircraft.length)}</td>
              <td className="num py-3 pr-4 text-right">{fmtInt(t.operators.length)}</td>
              <td className="num py-3 text-right text-fg-2">{t.age.mean != null ? `${t.age.mean.toFixed(1)} yrs` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TypesPage() {
  const types = getTypes();
  const meta = getMeta();
  return (
    <main className="py-10 sm:py-14">
      <JsonLd data={breadcrumbs([["Types", "/types"]])} />
      <Container>
        <PageHeader
          eyebrow={`${fmtInt(types.length)} types · as on ${fmtDate(meta.snapshot)}`}
          title="Aircraft types"
          lede="Every type on an Indian scheduled or non-scheduled operator permit, with how many are flying, who flies them and how old they are. Average age counts only aircraft with a known build year."
        />
        {GROUPS.map((g) => {
          const list = types.filter((t) => t.wing === g.wing);
          if (list.length === 0) return null;
          return (
            <section key={g.wing} className="mt-14">
              <SectionHeader title={g.title} meta={`${fmtInt(list.length)} types · ${fmtInt(list.reduce((n, t) => n + t.aircraft.length, 0))} aircraft`} />
              <TypeRows types={list} />
            </section>
          );
        })}
      </Container>
    </main>
  );
}
