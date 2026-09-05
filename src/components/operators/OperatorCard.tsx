import Link from "next/link";
import type { Aircraft, Operator } from "@/lib/types";
import { daysUntil, fmtDate, fmtInt } from "@/lib/format";
import { Plate } from "@/components/ui/Plate";
import { Stamp } from "@/components/ui/Stamp";
import { TypeMixBar, TypeMixLegend } from "./TypeMixBar";

/**
 * Scheduled-operator card: a photo plate with the data block continuing the same
 * frame underneath — fleet count, type mix, and permit validity.
 */
export function OperatorCard({ operator, hero, index }: { operator: Operator; hero: Aircraft | null; index: number }) {
  const left = daysUntil(operator.permit.validUntil);
  const expiring = left != null && left <= 180;
  const rise = index === 0 ? "rise" : index < 6 ? `rise rise-${index}` : "";

  return (
    <Link href={`/operators/${operator.id}`} className={`group flex flex-col ${rise}`}>
      <Plate
        image={hero?.image ?? null}
        wing={hero?.wing ?? "FW"}
        alt={hero ? `${hero.reg}, ${hero.type.name}, ${operator.name}` : operator.name}
        width={1280}
        aspect="aspect-[16/9]"
        hideCredit
        className="transition-colors duration-150 group-hover:border-ink"
      />
      <div className="flex flex-1 flex-col gap-2 border border-t-0 border-rule-2 bg-paper-2 px-[10px] pb-2.5 pt-2 transition-colors duration-150 group-hover:border-ink">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="display min-w-0 flex-1 break-words text-2xl group-hover:underline">{operator.name}</span>
          <span className="ml-auto flex shrink-0 items-baseline gap-1 whitespace-nowrap">
            <span className="display-num text-3xl">{fmtInt(operator.fleetCount)}</span>
            <span className="label label-dim">AC</span>
          </span>
        </div>
        <TypeMixBar types={operator.types} total={operator.fleetCount} />
        <TypeMixLegend types={operator.types} limit={3} />
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-1.5">
          <span className="mono text-[10.5px] text-ink-3">
            {operator.permit.no} · valid to {fmtDate(operator.permit.validUntil)}
          </span>
          {expiring && <Stamp tone="caution" className="ml-auto">Expiring</Stamp>}
        </div>
      </div>
    </Link>
  );
}
