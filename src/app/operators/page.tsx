import type { Metadata } from "next";
import { getAircraft, getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { NsopTable, type NsopRow } from "@/components/operators/NsopTable";
import { OperatorCard } from "@/components/operators/OperatorCard";
import { TitleBlock } from "@/components/ui/TitleBlock";

export const metadata: Metadata = {
  title: "Operators",
  description: "Indian scheduled and non-scheduled operators, their permits and their fleets.",
};

export default function OperatorsPage() {
  const operators = getOperators();
  const aircraft = getAircraft();
  const meta = getMeta();
  const heroFor = (reg: string | null) => (reg ? aircraft.find((a) => a.reg === reg) ?? null : null);

  const scheduled = operators
    .filter((o) => o.category === "scheduled")
    .sort((a, b) => b.fleetCount - a.fleetCount);
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
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <TitleBlock
        sheet="03"
        title="Operators"
        fields={[
          { label: "Rev", value: fmtDate(meta.snapshot) },
          { label: "Permits", value: fmtInt(operators.length) },
        ]}
      />
      <p className="mt-3 max-w-[62ch] text-sm text-ink-2">
        Every holder of a DGCA scheduled or non-scheduled operator permit, with the fleet recorded
        against it on the {fmtDate(meta.snapshot)} list.
      </p>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
          <span aria-hidden className="h-1.5 w-1.5 bg-signal" />
          <h2 className="stencil text-lg">Scheduled</h2>
          <span className="mono ml-auto text-[11px] text-ink-2">
            {scheduled.length} permits · {fmtInt(schedFleet)} aircraft
          </span>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {scheduled.map((o, i) => (
            <OperatorCard key={o.id} operator={o} hero={heroFor(o.heroReg)} index={i} />
          ))}
        </div>
      </section>

      <div className="threshold my-10" aria-hidden />

      <section>
        <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
          <span aria-hidden className="h-1.5 w-1.5 bg-mint" />
          <h2 className="stencil text-lg">Non-scheduled</h2>
          <span className="mono ml-auto text-[11px] text-ink-2">
            {nonScheduled.length} permits · {fmtInt(nsopFleet)} aircraft
          </span>
        </div>
        <div className="mt-5">
          <NsopTable rows={rows} />
        </div>
      </section>
    </main>
  );
}
