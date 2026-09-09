import Link from "next/link";
import type { IndexRecord } from "@/lib/types";
import { thumb } from "@/lib/format";
import { Silhouette } from "@/components/ui/Silhouette";
import { ListBadge } from "@/components/ui/Badge";
import { ROLE_LABEL } from "./indexData";

/** Default fleet view: a small photo, the registration, type and operator. */
export function FleetCards({ rows }: { rows: IndexRecord[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((a) => (
        <li key={a.r} className="min-w-0">
          <Link href={`/aircraft/${a.r}`} className="card card-hover flex h-full items-center gap-4 p-3">
            <div className="relative aspect-[4/3] w-[104px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-bg-3 sm:w-[120px]">
              {a.i ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb(a.i[0], 250)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-fg-3">
                  <Silhouette wing={a.w} className="h-1/2 w-1/2" strokeWidth={2} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="mono text-[16px] font-semibold text-fg">{a.r}</span>
                {a.ti && <span className="mono text-[12px] text-fg-3">{a.ti}</span>}
              </div>
              <p className="mt-0.5 truncate text-[15px] text-fg" title={a.m}>{a.t}</p>
              <p className="truncate text-[14px] text-fg-2">{a.on}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-3">
                <ListBadge scheduled={a.c === "S"} short />
                {a.ro !== "passenger" && a.ro !== "unknown" && <span>{ROLE_LABEL[a.ro]}</span>}
                {a.s != null && <span className="num">{a.s} seats</span>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
