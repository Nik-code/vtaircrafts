import type { Metadata } from "next";
import Link from "next/link";
import { getAircraft, getMeta, getOperators, getPastOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { NsopTable, type NsopRow } from "@/components/operators/NsopTable";
import { OperatorCard } from "@/components/operators/OperatorCard";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Indian airlines and charter operators",
  description: "Every Indian scheduled airline and non-scheduled operator with a DGCA permit, their fleets, plus past operators such as Jet Airways, Kingfisher, Go First and Vistara.",
  alternates: { canonical: "/operators" },
};

export default function OperatorsPage() {
  const operators = getOperators();
  const aircraft = getAircraft();
  const meta = getMeta();
  const heroFor = (reg: string | null) => (reg ? aircraft.find((a) => a.reg === reg) ?? null : null);

  const scheduled = operators.filter((o) => o.category === "scheduled").sort((a, b) => b.fleetCount - a.fleetCount);
  const nonScheduled = operators.filter((o) => o.category === "non-scheduled");
  const schedFleet = scheduled.reduce((n, o) => n + o.fleetCount, 0);
  const nsopFleet = nonScheduled.reduce((n, o) => n + o.fleetCount, 0);
  const past = getPastOperators();
  const pastMajor = past.filter((o) => o.regs.length >= 5);
  const pastMinor = past.filter((o) => o.regs.length < 5).sort((a, b) => a.name.localeCompare(b.name));

  const rows: NsopRow[] = nonScheduled.map((o) => ({
    id: o.id,
    name: o.name,
    legalName: o.legalName,
    permit: o.permit.no,
    validUntil: o.permit.validUntil,
    fw: o.wings.FW,
    rw: o.wings.RW,
    b: o.wings.B,
    fleet: o.fleetCount,
  }));

  return (
    <main className="py-10 sm:py-14">
      <Container>
        <PageHeader
          eyebrow={`${fmtInt(operators.length)} permit holders · as on ${fmtDate(meta.snapshot)}`}
          title="Operators"
          lede="Every holder of a DGCA scheduled or non-scheduled operator permit, with the fleet recorded against it."
        />

        <section className="mt-14">
          <SectionHeader title="Scheduled" meta={`${scheduled.length} airlines · ${fmtInt(schedFleet)} aircraft`} />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((o) => (
              <li key={o.id} className="min-w-0">
                <OperatorCard operator={o} hero={heroFor(o.heroReg)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <SectionHeader title="Non-scheduled" meta={`${nonScheduled.length} operators · ${fmtInt(nsopFleet)} aircraft`} />
          <NsopTable rows={rows} />
        </section>

        <p className="mt-10 text-[15px] text-fg-2">
          Flying schools hold a separate DGCA approval, not an operator permit. They are listed under{" "}
          <Link href="/flying-schools" className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
            flying schools
          </Link>
          .
        </p>

        <section className="mt-20">
          <SectionHeader title="Past operators" meta={`${past.length} with no permit today`} />
          <p className="mb-6 max-w-[64ch] text-[15px] text-fg-2">
            Operators that appear in earlier DGCA lists, back to 2005, but hold no permit today. Dates are the first and last list each was seen in.
          </p>
          <ul className="divide-y divide-line">
            {pastMajor.map((o) => (
              <li key={o.id}>
                <Link href={`/operators/${o.id}`} className="row grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 px-1 py-3 sm:grid-cols-[1fr_12rem_6rem]">
                  <span className="text-[15px] font-medium text-fg">{o.name}</span>
                  <span className="num order-3 col-span-2 text-[14px] text-fg-3 sm:order-none sm:col-span-1">
                    {o.firstSeen.slice(0, 4)} to {o.lastSeen.slice(0, 4)}
                  </span>
                  <span className="num text-right text-[15px]">{fmtInt(o.regs.length)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {pastMinor.length > 0 && (
            <p className="mt-6 text-[14px] leading-relaxed text-fg-2">
              Smaller:{" "}
              {pastMinor.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && ", "}
                  <Link href={`/operators/${o.id}`} className="underline decoration-line-2 underline-offset-4 hover:text-fg">
                    {o.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>
      </Container>
    </main>
  );
}
