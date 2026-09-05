import Link from "next/link";
import { Plate } from "@/components/ui/Plate";
import type { Aircraft } from "@/lib/types";

/**
 * Six photographed tails, one plate each, spread across operators and types.
 * The link covers the plate rather than wrapping it, so the photo credit inside
 * the caption stays its own link.
 */
export function PlateStrip({ aircraft }: { aircraft: Aircraft[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {aircraft.map((a, i) => (
        <div
          key={a.reg}
          className={`rise rise-${Math.min(i + 1, 5)} group relative [&_figcaption_a]:relative [&_figcaption_a]:z-20`}
        >
          <Plate
            image={a.image}
            wing={a.wing}
            alt={`${a.reg}, a ${a.type.name} of ${a.operator}`}
            fig={String(i + 1).padStart(2, "0")}
            width={1280}
            eager={i < 2}
            className="transition-colors duration-150 group-hover:border-ink"
            caption={
              <span className="group-hover:underline">
                {a.reg}
                <span className="text-ink-3">{" · "}</span>
                {a.type.name}
                <span className="text-ink-3">{" · "}</span>
                {a.operator}
              </span>
            }
          />
          <Link
            href={`/aircraft/${a.reg}`}
            aria-label={`${a.reg}, ${a.type.name}, ${a.operator}`}
            className="absolute inset-0 z-10"
          />
        </div>
      ))}
    </div>
  );
}
