import { CountUp } from "@/components/ui/CountUp";
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
  const rev = fmtDate(revision).toUpperCase();
  // ApronChart is a client component fetching its own SVG; hand it only the
  // few numbers it needs to draw the legend and reserve layout, never the
  // full per-aircraft groups (that would ship the whole apron a second time
  // inside the hydration payload).
  const apronTotal = groups.reduce((n, g) => n + g.aircraft.length, 0);
  const { height: apronHeight } = layoutApron(groups);

  return (
    <section className="blueprint px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-10 min-[1400px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)] min-[1400px]:gap-12">
        <div className="flex min-w-0 max-w-[520px] flex-col justify-center min-[1400px]:max-w-none">
          {/* Title block, drawn light for the blueprint ground */}
          <div className="border-y border-paper/40">
            <div className="grid grid-cols-[auto_1fr] divide-x divide-paper/40">
              <div className="flex flex-col justify-center px-3 py-2">
                <span className="label text-paper/55!">Sheet</span>
                <span className="mono text-sm">01</span>
              </div>
              <div className="flex items-center px-4 py-2">
                <h1 className="stencil text-2xl leading-none sm:text-3xl">India commercial fleet</h1>
              </div>
            </div>
          </div>

          <p className="label mt-6 text-paper/55!">Aircraft on DGCA operator lists</p>
          <div className="display-num mt-1 text-[clamp(78px,11vw,132px)] text-paper">
            <CountUp value={aircraft} duration={900} />
          </div>

          <p className="mono mt-6 text-[11px] text-paper/55">Rev {rev}</p>
        </div>

        <ApronChart total={apronTotal} operatorCount={groups.length} width={VW} height={apronHeight} />
      </div>
    </section>
  );
}
