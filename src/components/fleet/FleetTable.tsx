import Link from "next/link";
import type { IndexRecord } from "@/lib/types";
import { ListBadge } from "@/components/ui/Badge";

const COLS =
  "grid-cols-[5.5rem_minmax(0,1fr)_3rem] sm:grid-cols-[6rem_minmax(0,1.4fr)_minmax(0,1fr)_3.5rem_5rem] md:grid-cols-[6rem_5rem_minmax(0,1.4fr)_minmax(0,1fr)_3.5rem_5rem]";
const CELL = "grid items-center gap-3 px-3 sm:px-4";

/** Dense table. Every row is one link to the aircraft page. */
export function FleetTable({ rows }: { rows: IndexRecord[] }) {
  return (
    <div className="card overflow-hidden">
      <div className={`${CELL} ${COLS} border-b border-line py-2.5 text-[13px] font-medium text-fg-3`}>
        <span>Reg</span>
        <span className="hidden md:block">Hex</span>
        <span>Type</span>
        <span className="hidden sm:block">Operator</span>
        <span className="text-right">Seats</span>
        <span className="hidden text-right sm:block">List</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((a) => (
          <li key={a.r}>
            <Link href={`/aircraft/${a.r}`} className={`row ${CELL} ${COLS} py-3`}>
              <span className="mono text-[15px] font-medium text-fg">{a.r}</span>
              <span className="mono hidden text-[13px] text-fg-3 md:block">{a.h ?? "—"}</span>
              <span className="min-w-0 truncate text-[15px]" title={a.m}>
                {a.t}
                <span className="block truncate text-[13px] text-fg-3 sm:hidden">{a.on}</span>
              </span>
              <span className="hidden min-w-0 truncate text-[15px] text-fg-2 sm:block">{a.on}</span>
              <span className="num text-right text-[14px] text-fg-2">{a.s ?? "—"}</span>
              <span className="hidden justify-end sm:flex">
                <ListBadge scheduled={a.c === "S"} short />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
