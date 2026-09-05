import Link from "next/link";
import type { Aircraft } from "@/lib/types";
import { fmtDate, daysUntil } from "@/lib/format";
import { Stamp } from "@/components/ui/Stamp";

function Cell({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={`border-b border-r border-rule px-3.5 py-2.5 ${span ? "col-span-2" : ""}`}>
      <div className="label mb-1">{label}</div>
      <div className="mono text-[13px] leading-snug text-ink">{children}</div>
    </div>
  );
}

/** The stamped placard: registration, then an engraved grid of data-plate fields. */
export function Placard({ a }: { a: Aircraft }) {
  const validDays = daysUntil(a.permit.validUntil);
  const expiring = validDays != null && validDays < 180;
  const wingLabel = a.wing === "FW" ? "Fixed wing" : a.wing === "RW" ? "Rotary wing" : "Balloon";

  return (
    <div className="rivets grid-paper relative border border-rule-2 bg-paper-2/50 p-5 sm:p-7">
      <span className="rivet-b" />
      <div className="label mb-2 flex items-center justify-between">
        <span>Aircraft data plate</span>
        <span>{wingLabel}</span>
      </div>
      <div className="display-num text-[15vw] leading-none text-ink sm:text-[64px]">{a.reg}</div>

      <div className="mt-6 grid grid-cols-1 border-l border-t border-rule sm:grid-cols-2">
        <Cell label="Manufacturer">{a.type.manufacturer}</Cell>
        <Cell label="Model">{a.model}</Cell>
        <Cell label="Type">
          {a.type.name}
          {a.type.icao && <Stamp tone="dim" className="ml-2">{a.type.icao}</Stamp>}
        </Cell>
        <Cell label="Mode S hex">{a.hex ?? "not in database"}</Cell>
        {a.history?.msn && <Cell label="MSN">{a.history.msn}</Cell>}
        {a.history?.yearOfManufacture && <Cell label="Year">{a.history.yearOfManufacture}</Cell>}
        <Cell label="Seats">
          {a.seatsRaw ?? "—"}
          <Stamp tone="dim" className="ml-2">{a.role}</Stamp>
        </Cell>
        <Cell label="Operator">
          <Link href={`/operators/${a.operatorId}`} className="text-ink hover:text-signal">{a.operator}</Link>
          <div className="mt-0.5 text-[11px] text-ink-3">{a.operatorLegal}</div>
        </Cell>
        <Cell label={a.category === "scheduled" ? "AOC" : "AOP"}>{a.permit.no ?? "—"}</Cell>
        <Cell label="Valid until">
          {fmtDate(a.permit.validUntil)}
          {expiring && <Stamp tone="caution" className="ml-2">Expiring</Stamp>}
          {validDays != null && (
            <span className="ml-2 text-[11px] text-ink-3">{validDays >= 0 ? `+${validDays} d` : `${validDays} d`}</span>
          )}
        </Cell>
        <Cell label="List">
          <Stamp tone={a.category === "scheduled" ? "ink" : "mint"}>
            {a.category === "scheduled" ? "Scheduled" : "Non-scheduled"}
          </Stamp>
        </Cell>
        <Cell label="Source" span>
          DGCA {a.source.file} · page {a.source.page} · updated as on {fmtDate(a.source.asOn)}
        </Cell>
      </div>
    </div>
  );
}
