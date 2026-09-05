import type { ReactNode } from "react";
import marquee from "./marquee.module.css";
import "./stripbay.module.css";

/**
 * One ATC-style flight-progress strip bay: a label tab at the left edge,
 * outside the scrolling area, then a marquee viewport over a slotted-rail
 * tick background. The content is rendered twice (real + `inert` duplicate)
 * for the seamless CSS-transform loop from `marquee.module.css`; `reverse`
 * flips that loop's direction so the two bays in HomeTimeline scroll opposite
 * ways.
 */
export function StripBay({
  label,
  duration,
  reverse = false,
  cards,
}: {
  label: string;
  duration: string;
  reverse?: boolean;
  cards: ReactNode;
}) {
  return (
    <div className="flex items-stretch">
      <div className="label flex shrink-0 items-center px-3 text-ink-2">{label}</div>
      <div className={`${marquee.viewport} sb-rail min-w-0 flex-1 border-l border-rule`}>
        <div
          className={`${marquee.track} ${reverse ? marquee.reverse : ""}`}
          style={{ "--marquee-duration": duration } as React.CSSProperties}
        >
          <div className={`${marquee.segment} sb-row`}>{cards}</div>
          <div className={`${marquee.segment} ${marquee.duplicate} sb-row`} aria-hidden="true" inert>
            {cards}
          </div>
        </div>
      </div>
    </div>
  );
}
