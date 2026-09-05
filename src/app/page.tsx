import { getAircraft, getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import type { Wing } from "@/lib/types";
import { Hero } from "@/components/home/Hero";
import { Section } from "@/components/home/Section";
import { OperatorEngineChart } from "@/components/home/OperatorEngineChart";
import { TypeMix } from "@/components/home/TypeMix";
import { PermitHorizon } from "@/components/home/PermitHorizon";
import { Movements } from "@/components/home/Movements";
import { PlateStrip } from "@/components/home/PlateStrip";
import { HowDrawn } from "@/components/home/HowDrawn";
import {
  apronGroups,
  permitHorizon,
  plateSelection,
  recentMovements,
  seatsTotal,
  typeCount,
  typeRows,
} from "@/components/home/derive";

export default function Home() {
  const meta = getMeta();
  const operators = getOperators();
  const aircraft = getAircraft();
  const revision = meta.sources[0]?.asOn ?? meta.snapshot;
  const rev = fmtDate(revision);
  const wings: Record<Wing, number> = { FW: meta.counts.fixedWing, RW: meta.counts.rotary, B: meta.counts.balloons };
  const horizon = permitHorizon(30);
  const source = { label: "Source", value: "DGCA" };
  const revField = { label: "Rev", value: rev };

  return (
    <main className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <div className="sheet my-8 bg-paper">
        <Hero
          aircraft={meta.counts.aircraft}
          operators={meta.counts.operators}
          types={typeCount()}
          seats={seatsTotal()}
          revision={revision}
          groups={apronGroups()}
        />

        <div className="threshold" />

        <Section
          id="sheet-02"
          sheet="02"
          title="Fleet by operator"
          fields={[
            { label: "Fixed Wing", value: fmtInt(meta.counts.fixedWing) },
            { label: "Rotary", value: fmtInt(meta.counts.rotary) },
          ]}
        >
          <OperatorEngineChart operators={operators} total={meta.counts.aircraft} counts={meta.counts} />
        </Section>

        <Section sheet="03" title="Type mix" fields={[revField]}>
          <TypeMix rows={typeRows().slice(0, 12)} distinct={typeCount()} total={meta.counts.aircraft} wings={wings} />
        </Section>

        <Section sheet="04" title="Permit horizon" fields={[{ label: "Window", value: "30 months" }]}>
          <PermitHorizon start={horizon.start} months={horizon.months} expiries={horizon.expiries} />
        </Section>

        <Section sheet="05" title="Recent movements" fields={[{ label: "Prev", value: meta.previous ? fmtDate(meta.previous) : "—" }, revField]}>
          <Movements events={recentMovements(8)} />
        </Section>

        <Section sheet="06" title="Plates" fields={[source]}>
          <PlateStrip aircraft={plateSelection(6)} />
        </Section>

        <Section sheet="07" title="How this sheet is drawn" fields={[{ label: "Records", value: fmtInt(aircraft.length) }]}>
          <HowDrawn />
        </Section>
      </div>
    </main>
  );
}
