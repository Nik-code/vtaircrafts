import Link from "next/link";
import { Callout } from "./Callout";
import { HatchBar } from "@/components/ui/Hatch";
import { Silhouette } from "@/components/ui/Silhouette";
import { Stamp } from "@/components/ui/Stamp";
import { fmtInt } from "@/lib/format";
import type { Wing } from "@/lib/types";
import type { TypeRow } from "./derive";

const AIRFRAMES: Array<{ wing: Wing; label: string; note: string }> = [
  { wing: "FW", label: "Fixed wing", note: "Airliners, turboprops and business jets" },
  { wing: "RW", label: "Rotary", note: "Helicopters, almost all on non-scheduled permits" },
  { wing: "B", label: "Balloon", note: "Hot-air balloons on adventure permits" },
];

export function TypeMix({
  rows,
  distinct,
  total,
  wings,
}: {
  rows: TypeRow[];
  distinct: number;
  total: number;
  wings: Record<Wing, number>;
}) {
  const max = rows[0]?.count ?? 1;
  return (
    <>
      <Callout>
        {fmtInt(distinct)} types on the lists · top {rows.length} drawn
      </Callout>

      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {rows.map((t) => (
          <li key={t.name} className="row-hover px-2 py-2.5">
            <div className="grid gap-x-5 gap-y-2 sm:grid-cols-[minmax(230px,280px)_1fr] sm:items-center">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <Stamp tone="dim" className="shrink-0">{t.icao ?? "—"}</Stamp>
                  <Link
                    href={`/fleet?t=${encodeURIComponent(t.name)}`}
                    className="text-[15px] leading-tight transition-colors duration-150 hover:text-signal"
                  >
                    {t.name}
                  </Link>
                </span>
                <span className="mono text-sm sm:hidden">{fmtInt(t.count)}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="mono hidden w-40 shrink-0 truncate text-[11.5px] text-ink-3 lg:block">{t.manufacturer}</span>
                <HatchBar ratio={Math.round((t.count / max) * 1e4) / 1e4} tone="ink" height={13} className="flex-1" />
                <span className="mono hidden w-14 shrink-0 text-right text-sm sm:block">{fmtInt(t.count)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="label mt-9">Airframe split</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {AIRFRAMES.map((a, i) => {
          const n = wings[a.wing] ?? 0;
          const share = ((n / total) * 100).toFixed(n / total < 0.05 ? 1 : 0);
          return (
            <div key={a.wing} className={`rise rise-${i + 1} flex items-start gap-4 border border-rule bg-paper-2 px-4 py-4`}>
              <Silhouette wing={a.wing} className="mt-0.5 h-10 w-14 shrink-0 text-ink-2" />
              <div className="min-w-0">
                <div className="label">{a.label}</div>
                <div className="display-num mt-1 text-3xl">{fmtInt(n)}</div>
                <div className="mono mt-1 text-[11.5px] text-ink-3">{share}% of the fleet</div>
                <p className="mt-2 text-[13px] leading-snug text-ink-2">{a.note}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
