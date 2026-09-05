import { getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import type { Wing } from "@/lib/types";
import { Hero } from "@/components/home/Hero";
import { IntroStrip } from "@/components/home/IntroStrip";
import { Section } from "@/components/home/Section";
import { FleetComposition } from "@/components/home/FleetComposition";
import { TypeMixViz } from "@/components/home/TypeMixViz";
import { HomeTimeline } from "@/components/home/HomeTimeline";
import { PlateReel } from "@/components/home/PlateReel";
import {
  apronGroups,
  permitHorizon,
  plateSelection,
  recentMovements,
  typeRows,
} from "@/components/home/derive";

export default function Home() {
  const meta = getMeta();
  const operators = getOperators();
  const revision = meta.sources[0]?.asOn ?? meta.snapshot;
  const wings: Record<Wing, number> = { FW: meta.counts.fixedWing, RW: meta.counts.rotary, B: meta.counts.balloons };
  const horizon = permitHorizon(30);
  const rows = typeRows();
  const revField = { label: "Rev", value: fmtDate(revision) };
  const sourceField = { label: "Source", value: "DGCA" };

  return (
    <main className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <div className="sheet my-8 bg-paper">
        <Hero aircraft={meta.counts.aircraft} revision={revision} groups={apronGroups()} />

        <div className="threshold" />

        <IntroStrip />

        <Section
          id="sheet-02"
          sheet="02"
          title="Fleet by operator"
          fields={[
            { label: "Fixed Wing", value: fmtInt(meta.counts.fixedWing) },
            { label: "Rotary", value: fmtInt(meta.counts.rotary) },
          ]}
        >
          <FleetComposition operators={operators} counts={meta.counts} />
        </Section>

        <Section sheet="03" title="Type mix" fields={[revField]}>
          <TypeMixViz rows={rows} total={meta.counts.aircraft} wings={wings} />
        </Section>

        <Section sheet="04" title="Horizon and movements" fields={[{ label: "Window", value: "30 months" }, revField]}>
          <HomeTimeline
            events={recentMovements(24)}
            expiries={horizon.expiries}
            horizonStart={horizon.start}
            horizonMonths={horizon.months}
          />
        </Section>

        <Section sheet="05" title="Plates" fields={[sourceField]}>
          <PlateReel aircraft={plateSelection(12)} />
        </Section>
      </div>
    </main>
  );
}
