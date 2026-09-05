import Link from "next/link";
import type { IndexRecord } from "@/lib/types";
import { fmtDate, thumb } from "@/lib/format";
import { Silhouette } from "@/components/ui/Silhouette";
import { RepresentativeTag } from "@/components/ui/Plate";
import { Stamp } from "@/components/ui/Stamp";
import { ROLE_LABEL } from "./indexData";

/**
 * Card grid, the default fleet view: a small photo (or silhouette placeholder),
 * registration in stencil type, type + operator, and a mono data line. The
 * whole card links to the aircraft sheet. Hairlines form a drafting grid across
 * the whole set rather than a gap, so the sheet reads as one ruled surface.
 */
export function FleetCards({ rows }: { rows: IndexRecord[] }) {
  return (
    <div className="grid grid-cols-1 border-t border-l border-rule lg:grid-cols-2 min-[1600px]:grid-cols-3">
      {rows.map((a) => (
        <Link
          key={a.r}
          href={`/aircraft/${a.r}`}
          className="row-hover group flex items-stretch gap-3 border-b border-r border-rule p-2.5"
        >
          <div className="relative aspect-[3/2] w-[104px] shrink-0 overflow-hidden border border-rule-2 bg-paper-2 min-[420px]:w-32">
            {a.i && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb(a.i[0], 250)}
                alt={`${a.r}, ${a.t}, ${a.on}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            )}
            {a.i && a.i[1] !== 0 && <RepresentativeTag className="origin-top-left scale-[0.85]" />}
            {!a.i && (
              <div className="grid-paper grid h-full w-full place-items-center text-ink-3">
                <Silhouette wing={a.w} className="h-1/2 w-1/2" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex items-baseline gap-2">
              <span className="stencil text-[15px] leading-none text-ink group-hover:text-signal min-[420px]:text-[16px]">{a.r}</span>
              {a.ti && <span className="mono text-[10px] text-ink-3">{a.ti}</span>}
            </div>
            <div className="min-w-0 break-words text-[13px] leading-tight text-ink" title={a.m}>
              {a.t}
            </div>
            <div className="min-w-0 break-words text-[12px] leading-tight text-ink-2">{a.on}</div>
            <div className="mono flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[10.5px] leading-tight text-ink-3">
              <span>{a.s != null ? `${a.s} seats` : "Seats —"}</span>
              <span aria-hidden>·</span>
              <span>{a.h ?? "—"}</span>
              <Stamp tone={a.c === "S" ? "ink" : "mint"}>{a.c === "S" ? "Sch" : "Nsop"}</Stamp>
              {a.ro !== "passenger" && <Stamp tone="dim">{ROLE_LABEL[a.ro]}</Stamp>}
              <span className="ml-auto">{fmtDate(a.f)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
