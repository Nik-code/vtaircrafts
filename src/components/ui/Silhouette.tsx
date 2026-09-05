import type { Wing } from "@/lib/types";

/**
 * Plan-view silhouettes drawn as engineering outlines. Used as photo placeholders
 * and as small glyphs. Stroke inherits currentColor.
 */
export function Silhouette({ wing, className = "", strokeWidth = 1.4 }: { wing: Wing; className?: string; strokeWidth?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  if (wing === "RW") {
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden>
        <g {...common}>
          {/* fuselage */}
          <path d="M40 62 c0 -12 12 -20 30 -20 h36 c14 0 24 8 26 18 c1 6 -3 12 -12 12 h-52 c-16 0 -28 -3 -28 -10 z" />
          {/* tail boom + fin */}
          <path d="M132 60 h48 c6 0 10 -2 12 -6 l4 -10 M180 60 l6 8 M186 68 h6" />
          {/* skids */}
          <path d="M56 78 v8 h56 v-8 M64 86 h-10 M118 86 h10" />
          {/* rotor mast and blades */}
          <path d="M92 42 v-10" />
          <path d="M92 32 l70 -14 M92 32 l-64 -14 M92 32 l10 -22 M92 32 l-8 -22" strokeDasharray="3 4" />
          <circle cx="92" cy="32" r="3" />
          {/* window */}
          <path d="M52 50 c8 -6 18 -8 28 -6" />
        </g>
      </svg>
    );
  }
  if (wing === "B") {
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden>
        <g {...common}>
          <ellipse cx="100" cy="46" rx="38" ry="36" />
          <path d="M72 70 c10 12 46 12 56 0" />
          <path d="M84 78 l6 20 M116 78 l-6 20" />
          <rect x="88" y="98" width="24" height="12" />
          <path d="M100 10 v72" strokeDasharray="2 4" />
          <path d="M66 46 h68" strokeDasharray="2 4" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden>
      <g {...common}>
        {/* fuselage side profile */}
        <path d="M14 66 c0 -8 10 -12 24 -12 h110 c12 0 22 -2 30 -8 l14 -10 c3 -2 6 -1 6 2 v14 c0 8 -8 14 -20 14 h-140 c-14 0 -24 -3 -24 -8 z" />
        {/* windows */}
        <path d="M60 56 h70" strokeDasharray="4 5" />
        {/* wing */}
        <path d="M76 66 l-14 26 h14 l24 -26" />
        <path d="M84 54 l-10 -26 h12 l20 26" />
        {/* horizontal stabiliser */}
        <path d="M172 60 l12 -14 h8 l-8 14" />
        {/* engine */}
        <path d="M96 66 c0 6 4 10 10 10 h14 c6 0 10 -4 10 -10" />
        {/* gear */}
        <path d="M40 74 v8 M120 74 v8" />
        <circle cx="40" cy="85" r="3" />
        <circle cx="120" cy="85" r="3" />
        {/* datum line */}
        <path d="M6 96 h188" strokeDasharray="1 5" strokeWidth={1} />
      </g>
    </svg>
  );
}
