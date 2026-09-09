import type { Metadata } from "next";
import { getAircraft, getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { NsopTable, type NsopRow } from "@/components/operators/NsopTable";
import { OperatorCard } from "@/components/operators/OperatorCard";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Operators",
  description: "Indian scheduled and non-scheduled operators, their permits and their fleets.",
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
      </Container>
    </main>
  );
}
