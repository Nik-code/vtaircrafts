/**
 * SVG hatch patterns. Render <HatchDefs/> once per SVG that uses fill="url(#hatch-ink)".
 * For simple CSS bars use the .hatch-ink / .hatch-mint / .hatch-signal utilities.
 */
export function HatchDefs() {
  return (
    <defs>
      <pattern id="hatch-ink" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="1" />
      </pattern>
      <pattern id="hatch-mint" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--mint)" strokeWidth="1" />
      </pattern>
      <pattern id="hatch-signal" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--signal)" strokeWidth="1.4" />
      </pattern>
      <pattern id="hatch-light" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(243,240,232,0.75)" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

/** Horizontal hatched bar with a solid leading edge. value/max in [0,1]. */
export function HatchBar({ ratio, tone = "ink", height = 14, className = "" }: { ratio: number; tone?: "ink" | "mint" | "signal"; height?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const hatch = tone === "mint" ? "hatch-mint" : tone === "signal" ? "hatch-signal" : "hatch-ink";
  const edge = tone === "mint" ? "bg-mint" : tone === "signal" ? "bg-signal" : "bg-ink";
  return (
    <div className={`relative w-full bg-paper-2 ${className}`} style={{ height }}>
      <div className={`absolute inset-y-0 left-0 ${hatch}`} style={{ width: `${pct}%` }} />
      <div className={`absolute inset-y-0 w-[2px] ${edge}`} style={{ left: `calc(${pct}% - 1px)` }} />
    </div>
  );
}
