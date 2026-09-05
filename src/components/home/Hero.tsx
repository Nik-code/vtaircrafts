import { ButtonLink } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { Callout } from "./Callout";
import { fmtDate, fmtInt } from "@/lib/format";
import { ApronChart } from "./ApronChart";
import type { ApronGroup } from "./apron";

const lightGhost =
  "border-paper/45! text-paper! hover:bg-paper! hover:text-ink! hover:border-paper!";

export function Hero({
  aircraft,
  operators,
  types,
  seats,
  revision,
  groups,
}: {
  aircraft: number;
  operators: number;
  types: number;
  seats: number;
  revision: string;
  groups: ApronGroup[];
}) {
  const rev = fmtDate(revision).toUpperCase();
  const stats = [
    { label: "Operators", value: fmtInt(operators) },
    { label: "Aircraft types", value: fmtInt(types) },
    { label: "Seats on the lists", value: fmtInt(seats) },
  ];

  return (
    <section className="blueprint px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-10 min-[1400px]:grid-cols-[minmax(0,420px)_minmax(0,1fr)] min-[1400px]:gap-12">
        <div className="flex min-w-0 max-w-[620px] flex-col min-[1400px]:max-w-none">
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

          <p className="label mt-5 text-paper/55!">Aircraft on DGCA operator lists</p>
          <div className="display-num mt-1 text-[clamp(78px,11vw,132px)] text-paper">
            <CountUp value={aircraft} duration={900} />
          </div>

          <Callout tone="light" className="mt-4" innerClassName="max-w-[min(72vw,336px)] text-center">
            {fmtInt(aircraft)} aircraft on DGCA operator lists
            <span className="block">Rev {rev}</span>
          </Callout>

          <dl className="mt-7 grid grid-cols-3 gap-px border border-paper/25 bg-paper/25">
            {stats.map((s) => (
              <div key={s.label} className="bg-blue px-2.5 py-3 sm:px-3">
                <dt className="label text-paper/55!">{s.label}</dt>
                <dd className="mono mt-1 text-base leading-none text-paper sm:text-lg">{s.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-paper/80">
            One sheet for every aircraft flying under an Indian scheduled or non-scheduled operator
            permit, redrawn each month from the DGCA&apos;s own lists.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/fleet" tone="signal">Open the fleet</ButtonLink>
            <ButtonLink href="/operators" tone="ghost" className={lightGhost}>Operators</ButtonLink>
          </div>
        </div>

        <ApronChart groups={groups} />
      </div>
    </section>
  );
}
