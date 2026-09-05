import { CountUp } from "@/components/ui/CountUp";
import { fmtDate } from "@/lib/format";
import { ApronChart } from "./ApronChart";
import { layoutApron, type ApronGroup } from "./apron";

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
  const { width: apronWidth, height: apronHeight } = layoutApron(groups);

  return (
    <section className="blueprint px-5 py-6 sm:px-10 sm:py-10">
      <div className="grid gap-10 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
        <div className="flex min-w-0 flex-col">
          <p className="label text-paper/55!">India · commercial fleet · DGCA operator lists</p>

          <div className="display-num mt-3 text-[clamp(56px,22vw,168px)] text-paper">
            <CountUp value={aircraft} duration={900} />
          </div>

          <p className="mt-4 max-w-[38ch] text-[15px] text-paper/80">
            aircraft on the scheduled and non-scheduled lists, as on {rev}.
          </p>
        </div>

        <ApronChart total={apronTotal} width={apronWidth} height={apronHeight} />
      </div>
    </section>
  );
}
