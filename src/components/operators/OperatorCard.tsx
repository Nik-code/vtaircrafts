import Link from "next/link";
import type { Aircraft, Operator } from "@/lib/types";
import { daysUntil, fmtDate, fmtInt } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Badge } from "@/components/ui/Badge";

/** Scheduled-operator card: photo, name, fleet count, top types, permit validity. */
export function OperatorCard({ operator, hero }: { operator: Operator; hero: Aircraft | null }) {
  const left = daysUntil(operator.permit.validUntil);
  const expiring = left != null && left <= 180;
  const top = operator.types.slice(0, 3);

  return (
    <Link href={`/operators/${operator.id}`} className="card card-hover flex h-full flex-col overflow-hidden">
      <Photo
        image={hero?.image ?? null}
        wing={hero?.wing ?? "FW"}
        alt={hero ? `${hero.reg}, ${hero.type.name}, ${operator.name}` : operator.name}
        width={960}
        aspect="aspect-[16/9]"
        rounded=""
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-[19px] font-semibold leading-tight">{operator.name}</h3>
          <span className="num shrink-0 text-[19px] font-semibold">{fmtInt(operator.fleetCount)}</span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-2">
          {top.map((t) => `${t.count} ${t.icao ?? t.name}`).join(" · ")}
          {operator.types.length > 3 ? ` · +${operator.types.length - 3} more` : ""}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[13px] text-fg-3">
          <span>Valid to {fmtDate(operator.permit.validUntil)}</span>
          {expiring && <Badge tone="danger">Expiring</Badge>}
        </div>
      </div>
    </Link>
  );
}
