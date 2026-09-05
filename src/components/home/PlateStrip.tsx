import { Plate } from "@/components/ui/Plate";
import type { Aircraft } from "@/lib/types";

/**
 * Six photographed tails, one plate each, spread across operators and types.
 * Plate's own `href` prop links just the image; the caption's photo credit
 * keeps its own anchor, so there is no need for a stretched overlay link.
 */
export function PlateStrip({ aircraft }: { aircraft: Aircraft[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {aircraft.map((a, i) => (
        <Plate
          key={a.reg}
          image={a.image}
          wing={a.wing}
          alt={`${a.reg}, a ${a.type.name} of ${a.operator}`}
          fig={String(i + 1).padStart(2, "0")}
          width={1280}
          eager={i < 2}
          href={`/aircraft/${a.reg}`}
          className={`rise rise-${Math.min(i + 1, 5)} transition-colors duration-150 has-[>a:hover]:border-ink`}
          caption={
            <span>
              {a.reg}
              <span className="text-ink-3">{" · "}</span>
              {a.type.name}
              <span className="text-ink-3">{" · "}</span>
              {a.operator}
            </span>
          }
        />
      ))}
    </div>
  );
}
