import Link from "next/link";
import type { Aircraft } from "@/lib/types";
import { fmtDate, daysUntil } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { ROLE_LABEL } from "@/components/fleet/indexData";

/** The facts DGCA prints for this tail, as a plain two-column list. */
export function Placard({ a }: { a: Aircraft }) {
  const validDays = daysUntil(a.permit.validUntil);
  const expiring = validDays != null && validDays < 180;
  const wingLabel = a.wing === "FW" ? "Fixed wing" : a.wing === "RW" ? "Rotary wing" : "Balloon";

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
      <Field label="Manufacturer">{a.type.manufacturer}</Field>
      <Field label="Type">
        {a.type.name}
        {a.type.icao && <span className="mono ml-2 text-[13px] text-fg-3">{a.type.icao}</span>}
      </Field>
      <Field label="Model as printed">{a.model}</Field>
      <Field label="Airframe">{wingLabel}</Field>
      <Field label="Mode S hex">
        <span className="mono">{a.hex ?? "Not in database"}</span>
      </Field>
      <Field label="Seats">
        {a.seatsRaw ?? "—"}
        {a.role !== "unknown" && <span className="ml-2 text-fg-3">{ROLE_LABEL[a.role]}</span>}
      </Field>
      {a.history?.msn && (
        <Field label="Serial number">
          <span className="mono">{a.history.msn}</span>
        </Field>
      )}
      {a.history?.yearOfManufacture && <Field label="Built">{a.history.yearOfManufacture}</Field>}
      <Field label="Operator" className="col-span-2">
        <Link href={`/operators/${a.operatorId}`} className="underline decoration-line-2 underline-offset-4 hover:decoration-fg">{a.operator}</Link>
        <span className="mt-0.5 block text-[14px] text-fg-3">{a.operatorLegal}</span>
      </Field>
      <Field label={a.category === "scheduled" ? "Permit (AOC)" : "Permit (AOP)"}>
        <span className="mono">{a.permit.no ?? "—"}</span>
      </Field>
      <Field label="Valid until">
        {fmtDate(a.permit.validUntil)}
        {expiring && <Badge tone="danger" className="ml-2">Expiring</Badge>}
      </Field>
      <Field label="On the list since">{fmtDate(a.history?.firstSnapshot ?? a.firstSeen)}</Field>
      <Field label="Source">
        DGCA {a.source.file}, page {a.source.page}
        <span className="mt-0.5 block text-[14px] text-fg-3">as on {fmtDate(a.source.asOn)}</span>
      </Field>
    </dl>
  );
}
