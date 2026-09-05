import Link from "next/link";
import type { IndexRecord } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";

const COLS =
  "grid-cols-[4.5rem_minmax(0,1fr)_2.5rem_4rem] sm:grid-cols-[5.75rem_minmax(0,1.5fr)_minmax(0,1.1fr)_3.25rem_4.75rem] md:grid-cols-[5.75rem_4.75rem_minmax(0,1.5fr)_minmax(0,1.2fr)_3.25rem_4.75rem]";
const CELL = "grid items-center gap-2 px-3 sm:gap-3";

/** Dense log table. Every row is a single link to the aircraft sheet. */
export function FleetTable({ rows }: { rows: IndexRecord[] }) {
  return (
    <div className="border border-rule">
      <div
        className={`label z-20 border-b border-ink bg-paper py-1.5 sm:sticky sm:top-[49px] ${CELL} ${COLS}`}
      >
        <span>Reg</span>
        <span className="hidden md:block">Hex</span>
        <span>Type</span>
        <span className="hidden sm:block">Operator</span>
        <span className="text-right">Seats</span>
        <span className="text-right">List</span>
      </div>
      <div>
        {rows.map((a, i) => (
          <Link
            key={a.r}
            href={`/aircraft/${a.r}`}
            className={`row-hover group border-b border-rule py-1.5 last:border-b-0 ${i % 2 === 1 ? "bg-paper-2/40" : ""} ${CELL} ${COLS}`}
          >
            <span className="mono text-[13px] text-ink group-hover:text-signal">{a.r}</span>
            <span className="mono hidden text-[12px] text-ink-3 md:block">{a.h ?? "—"}</span>
            <span className="min-w-0 truncate text-[13px]" title={a.m}>
              {a.t}
              {a.ti && <span className="mono ml-2 hidden text-[10px] text-ink-3 sm:inline">{a.ti}</span>}
            </span>
            <span className="hidden min-w-0 truncate text-[13px] text-ink-2 sm:block">{a.on}</span>
            <span className="mono text-right text-[12px] text-ink-2">{a.s ?? "—"}</span>
            <span className="flex justify-end">
              <Stamp tone={a.c === "S" ? "ink" : "mint"}>{a.c === "S" ? "Sch" : "Nsop"}</Stamp>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
