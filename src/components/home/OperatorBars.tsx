import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "./Callout";
import { HatchBar } from "@/components/ui/Hatch";
import { fmtInt } from "@/lib/format";
import type { Operator } from "@/lib/types";

export function OperatorBars({ operators, total, shown }: { operators: Operator[]; total: number; shown: Operator[] }) {
  const max = shown[0]?.fleetCount ?? 1;
  const covered = shown.reduce((n, o) => n + o.fleetCount, 0);
  return (
    <>
      <Callout>
        Top {shown.length} operators · {fmtInt(covered)} of {fmtInt(total)} aircraft
      </Callout>

      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {shown.map((o) => {
          const scheduled = o.category === "scheduled";
          return (
            <li key={o.id} className="row-hover px-2 py-2.5">
              <div className="grid gap-x-5 gap-y-2 sm:grid-cols-[minmax(220px,250px)_1fr] sm:items-center">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/operators/${o.id}`} className="text-[15px] leading-tight transition-colors duration-150 hover:text-signal">
                    {o.name}
                  </Link>
                  <span className="mono text-sm sm:hidden">{fmtInt(o.fleetCount)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <HatchBar ratio={Math.round((o.fleetCount / max) * 1e4) / 1e4} tone={scheduled ? "ink" : "mint"} height={13} className="flex-1" />
                  <span className="mono hidden w-14 shrink-0 text-right text-sm sm:block">{fmtInt(o.fleetCount)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <span className="label flex items-center gap-2"><span className="hatch-ink h-3 w-7 border border-rule-2" />Scheduled</span>
          <span className="label flex items-center gap-2"><span className="hatch-mint h-3 w-7 border border-rule-2" />Non-scheduled</span>
        </div>
        <ButtonLink href="/operators">All {fmtInt(operators.length)} operators</ButtonLink>
      </div>
    </>
  );
}
