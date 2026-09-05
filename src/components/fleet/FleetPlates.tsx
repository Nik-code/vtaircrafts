import Link from "next/link";
import type { IndexRecord } from "@/lib/types";
import { Plate } from "@/components/ui/Plate";
import { Stamp } from "@/components/ui/Stamp";
import { plateImage } from "./indexData";

/**
 * Photo-plate grid. Credits live on the aircraft sheet; a stamp flags stand-ins.
 * Width stays at the stored 1280: the Commons thumb host answers 400 for widths
 * it has not pre-rendered (640 included), so re-sizing the URL breaks the image.
 */
export function FleetPlates({ rows }: { rows: IndexRecord[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((a, i) => (
        <Link key={a.r} href={`/aircraft/${a.r}`} className="group block">
          <Plate
            image={plateImage(a.i)}
            wing={a.w}
            alt={`${a.r}, ${a.t}, ${a.on}`}
            width={1280}
            aspect="aspect-[16/10]"
            hideCredit
            className={`h-full transition-colors duration-150 group-hover:border-ink ${i === 0 ? "rise" : i < 6 ? `rise rise-${i}` : ""}`}
            caption={
              <span className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="mono text-[13px] text-ink group-hover:underline">{a.r}</span>
                <span className="text-ink-2">{a.t}</span>
                <span className="min-w-0 truncate text-ink-3">{a.on}</span>
                {a.i && a.i[1] > 0 && <Stamp tone="dim" className="ml-auto">Repr.</Stamp>}
              </span>
            }
          />
        </Link>
      ))}
    </div>
  );
}
