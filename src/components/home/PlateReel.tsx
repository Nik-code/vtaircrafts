import { Plate } from "@/components/ui/Plate";
import type { Aircraft } from "@/lib/types";
import marquee from "./reel/marquee.module.css";
import filmstrip from "./reel/filmstrip.module.css";

/**
 * A film-strip reel of photo plates: one row of `Plate`s, auto-scrolling
 * horizontally, seamless loop by duplicating the row once. Sprocket-hole
 * bands top and bottom read as a film strip; pausing and the reduced-motion
 * fallback come from `marquee.module.css`.
 */
export function PlateReel({ aircraft }: { aircraft: Aircraft[] }) {
  return (
    <div className="border border-rule-2 bg-paper-2">
      <div className={filmstrip.sprockets} />
      <div className={`${marquee.viewport} border-y border-rule`}>
        <div className={marquee.track} style={{ "--marquee-duration": "95s" } as React.CSSProperties}>
          <div className={marquee.segment}>
            <Row aircraft={aircraft} eager />
          </div>
          <div className={`${marquee.segment} ${marquee.duplicate}`} aria-hidden="true" inert>
            <Row aircraft={aircraft} eager={false} />
          </div>
        </div>
      </div>
      <div className={filmstrip.sprockets} />
    </div>
  );
}

function Row({ aircraft, eager }: { aircraft: Aircraft[]; eager: boolean }) {
  return (
    <div className="flex gap-5 px-5 py-4">
      {aircraft.map((a, i) => (
        <Plate
          key={a.reg}
          image={a.image}
          wing={a.wing}
          alt={`${a.reg}, a ${a.type.name} of ${a.operator}`}
          fig={String(i + 1).padStart(2, "0")}
          width={500}
          eager={eager && i < 3}
          href={`/aircraft/${a.reg}`}
          className="w-[300px] shrink-0 transition-colors duration-150 has-[>a:hover]:border-ink"
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
