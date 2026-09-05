import { CountUp } from "@/components/ui/CountUp";
import { Streamlines } from "@/components/ui/Streamlines";
import { fmtDate } from "@/lib/format";
import { ApronChart } from "./ApronChart";
import { layoutApron, VW, type ApronGroup } from "./apron";

export function Hero({
  aircraft,
  revision,
  groups,
}: {
  aircraft: number;
  revision: string;
  groups: ApronGroup[];
}) {
  const rev = fmtDate(revision);
  // ApronChart is a client component fetching its own SVG; hand it only the
  // few numbers it needs to reserve layout and draw its legend, never the
  // full per-aircraft groups (that would ship the whole apron a second time
  // inside the hydration payload).
  const apronTotal = groups.reduce((n, g) => n + g.aircraft.length, 0);
  const { height: apronHeight } = layoutApron(groups);

  return (
    <section className="blueprint px-5 py-6 sm:px-10 sm:py-10">
      <div className="grid gap-10 min-[1400px]:grid-cols-[400px_minmax(0,1fr)] min-[1400px]:gap-12">
        <div className="flex min-w-0 max-w-[520px] flex-col min-[1400px]:max-w-none">
          <p className="label text-paper/55!">India · commercial fleet · DGCA operator lists</p>

          <div className="display-num mt-3 text-[clamp(96px,12vw,168px)] text-paper">
            <CountUp value={aircraft} duration={900} />
          </div>

          <p className="mt-4 max-w-[380px] text-[15px] text-paper/80">
            aircraft on the scheduled and non-scheduled lists, as on {rev}.
          </p>

          <div className="min-h-8 flex-1" />

          <Streamlines
            className="pointer-events-none hidden h-28 w-full opacity-[0.1] min-[1400px]:block"
            airfoil={false}
          />
        </div>

        <ApronChart total={apronTotal} width={VW} height={apronHeight} />
      </div>
    </section>
  );
}
