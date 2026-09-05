import type { Metadata } from "next";
import Link from "next/link";
import { getAircraft, getOperators } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { AircraftPhoto } from "@/components/AircraftPhoto";
import { Tag } from "@/components/Tag";

export const metadata: Metadata = { title: "Operators", description: "Indian scheduled and non-scheduled operators and their fleets." };

export default function OperatorsPage() {
  const ops = getOperators();
  const aircraft = getAircraft();
  const hero = (reg: string | null) => (reg ? aircraft.find((a) => a.reg === reg) ?? null : null);
  const scheduled = ops.filter((o) => o.category === "scheduled");
  const nsop = ops.filter((o) => o.category === "non-scheduled");
  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="label mb-2">Operators</div>
      <h1 className="display mb-10 text-4xl sm:text-5xl">{ops.length} permit holders</h1>

      <h2 className="label mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 bg-accent" />Scheduled · {scheduled.length}</h2>
      <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {scheduled.map((o) => {
          const h = hero(o.heroReg);
          return (
            <Link key={o.id} href={`/operators/${o.id}`} className="group frame hairline overflow-hidden bg-bg-elev">
              <div className="aspect-[16/9] overflow-hidden">
                <AircraftPhoto image={h?.image ?? null} wing={h?.wing ?? "FW"} alt={o.name} width={640} className="h-full w-full transition duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="display text-2xl">{o.name}</div>
                  <div className="display text-2xl text-accent">{o.fleetCount}</div>
                </div>
                <div className="mono mt-1 truncate text-xs text-fg-muted">{o.types.slice(0, 3).map((t) => `${t.count}× ${t.icao ?? t.name}`).join(" · ")}</div>
                <div className="mono mt-2 text-[10px] text-fg-dim">{o.permit.no} · valid to {fmtDate(o.permit.validUntil)}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="label mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 bg-teal" />Non-scheduled · {nsop.length}</h2>
      <div>
        <div className="logrow text-fg-dim" style={{ gridTemplateColumns: "1fr 6rem 8rem 1fr 3rem" }}>
          <span>OPERATOR</span><span>PERMIT</span><span>VALID TO</span><span>FLEET</span><span className="text-right">AC</span>
        </div>
        {nsop.map((o) => (
          <Link key={o.id} href={`/operators/${o.id}`} className="logrow group" style={{ gridTemplateColumns: "1fr 6rem 8rem 1fr 3rem" }}>
            <span className="truncate text-fg group-hover:text-teal">{o.name}<span className="ml-2 hidden text-fg-dim sm:inline">{o.legalName !== o.name ? o.legalName : ""}</span></span>
            <span className="text-fg-dim">{o.permit.no ?? "—"}</span>
            <span className="text-fg-muted">{fmtDate(o.permit.validUntil)}</span>
            <span className="truncate text-fg-muted">
              {o.wings.FW ? <Tag tone="dim">{o.wings.FW} FW</Tag> : null}{" "}
              {o.wings.RW ? <Tag tone="dim">{o.wings.RW} RW</Tag> : null}{" "}
              {o.wings.B ? <Tag tone="dim">{o.wings.B} B</Tag> : null}
              <span className="ml-2 hidden lg:inline">{o.types.slice(0, 2).map((t) => t.name).join(", ")}</span>
            </span>
            <span className="text-right text-fg">{o.fleetCount}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
