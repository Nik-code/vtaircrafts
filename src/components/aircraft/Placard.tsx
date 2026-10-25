import Link from "next/link";
import type { Aircraft } from "@/lib/types";
import { fmtDate, daysUntil } from "@/lib/format";
import { getEnrichment } from "@/lib/data";
import { ageOf, builtYear, hasOwnerPage, ownerName, typeSlugOf } from "@/lib/registry";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { ROLE_LABEL } from "@/components/fleet/indexData";

const LINK = "underline decoration-line-2 underline-offset-4 hover:decoration-fg";

/** An owner or lessor name as DGCA prints it, linked to its owner page. */
export function OwnerLink({ raw }: { raw: string | null | undefined }) {
  const o = ownerName(raw);
  if (!o) return <>—</>;
  if (!hasOwnerPage(o.slug)) return <>{o.name}</>;
  return (
    <Link href={`/owners/${o.slug}`} className={LINK}>
      {o.name}
    </Link>
  );
}

/** The facts DGCA prints for this tail, as a plain two-column list. */
export function Placard({ a }: { a: Aircraft }) {
  const validDays = daysUntil(a.permit.validUntil);
  const expiring = validDays != null && validDays < 180;
  const wingLabel = a.wing === "FW" ? "Fixed wing" : a.wing === "RW" ? "Rotary wing" : "Balloon";
  const extra = getEnrichment(a.reg);
  const built = builtYear(a);
  const age = ageOf(a);
  const typeSlug = typeSlugOf(a.type.name);
  const msn = a.history?.msn ?? extra?.msn ?? null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
      <Field label="Manufacturer">{a.type.manufacturer}</Field>
      <Field label="Type">
        {typeSlug ? (
          <Link href={`/types/${typeSlug}`} className={LINK}>
            {a.type.name}
          </Link>
        ) : (
          a.type.name
        )}
        {a.type.icao && <span className="mono ml-2 text-[13px] text-fg-3">{a.type.icao}</span>}
      </Field>
      <Field label="Model as printed">{a.model}</Field>
      <Field label="Airframe">{wingLabel}</Field>
      {msn && (
        <Field label="Serial number">
          <span className="mono">{msn}</span>
          {!a.history?.msn && <span className="mt-0.5 block text-[13px] text-fg-3">VRS standing-data</span>}
        </Field>
      )}
      {built && (
        <Field label="Built">
          {built.year}
          {age != null && <span className="ml-2 text-fg-3">{age === 0 ? "under a year" : `${age} ${age === 1 ? "year" : "years"}`}</span>}
          {built.source === "vrs" && <span className="mt-0.5 block text-[13px] text-fg-3">VRS standing-data</span>}
        </Field>
      )}
      {extra?.engine && (
        <Field label="Engines">
          {extra.engine}
          <span className="mt-0.5 block text-[13px] text-fg-3">{extra.engineSource === "model" ? "From the model number" : "Only option on this type"}</span>
        </Field>
      )}
      <Field label="Seats">
        {a.seatsRaw ?? "—"}
        {a.role !== "unknown" && <span className="ml-2 text-fg-3">{ROLE_LABEL[a.role]}</span>}
      </Field>
      <Field label="Mode S hex">
        <span className="mono">{a.hex ?? "Not in database"}</span>
      </Field>
      <Field label="Operator" className="col-span-2">
        <Link href={`/operators/${a.operatorId}`} className={LINK}>{a.operator}</Link>
        <span className="mt-0.5 block text-[14px] text-fg-3">{a.operatorLegal}</span>
      </Field>
      {a.history?.owner && (
        <Field label="Registered owner">
          <OwnerLink raw={a.history.owner} />
        </Field>
      )}
      {a.history?.lessor && ownerName(a.history.lessor) && (
        <Field label="Lessor">
          <OwnerLink raw={a.history.lessor} />
        </Field>
      )}
      <Field label={a.category === "scheduled" ? "Permit (AOC)" : "Permit (AOP)"}>
        <span className="mono">{a.permit.no ?? "—"}</span>
      </Field>
      <Field label="Valid until">
        {fmtDate(a.permit.validUntil)}
        {expiring && <Badge tone="danger" className="ml-2">Expiring</Badge>}
      </Field>
      {a.history?.registeredOn && <Field label="Registered in India">{fmtDate(a.history.registeredOn)}</Field>}
      <Field label="On the list since">{fmtDate(a.history?.firstSnapshot ?? a.firstSeen)}</Field>
      <Field label="Source" className="col-span-2">
        DGCA {a.source.file}, page {a.source.page}
        <span className="mt-0.5 block text-[14px] text-fg-3">as on {fmtDate(a.source.asOn)}</span>
      </Field>
    </dl>
  );
}
