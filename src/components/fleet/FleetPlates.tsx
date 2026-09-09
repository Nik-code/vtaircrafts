import Link from "next/link";
import type { IndexRecord } from "@/lib/types";
import { Photo } from "@/components/ui/Photo";
import { plateImage } from "./indexData";

/** Photo grid. Width stays at a Commons-rendered step (see lib/format thumb). */
export function FleetPlates({ rows }: { rows: IndexRecord[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
      {rows.map((a) => (
        <li key={a.r} className="min-w-0">
          <Link href={`/aircraft/${a.r}`} className="group block">
            <Photo image={plateImage(a.i)} wing={a.w} alt={`${a.r}, ${a.t}, ${a.on}`} width={960} aspect="aspect-[4/3]" className="transition-opacity group-hover:opacity-90" />
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <span className="mono text-[15px] font-medium">{a.r}</span>
              {a.i && a.i[1] > 0 && <span className="text-[12px] text-fg-3">Representative</span>}
            </div>
            <p className="truncate text-[14px] text-fg-2">{a.t}</p>
            <p className="truncate text-[13px] text-fg-3">{a.on}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
