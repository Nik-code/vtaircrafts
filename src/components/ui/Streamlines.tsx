/**
 * Wind-tunnel streamlines flowing around an airfoil section. Pure SVG, animated
 * with stroke-dashoffset drift (disabled under reduced motion via .streamline).
 * `tone` "light" for blueprint panels, "ink" for paper.
 */
export function Streamlines({ className = "", tone = "light", airfoil = true }: { className?: string; tone?: "light" | "ink"; airfoil?: boolean }) {
  const stroke = tone === "light" ? "rgba(243,240,232,0.55)" : "rgba(18,33,58,0.35)";
  const strong = tone === "light" ? "rgba(243,240,232,0.9)" : "rgba(18,33,58,0.8)";
  // Lines bend around a NACA-style section centred at (300,120)
  const lines = [-52, -40, -28, -16, 16, 28, 40, 52].map((dy, i) => {
    const y = 120 + dy;
    const bulge = Math.sign(dy) * Math.max(0, 26 - Math.abs(dy) * 0.45);
    return (
      <path
        key={i}
        d={`M0 ${y} C 180 ${y}, 220 ${y - bulge}, 300 ${y - bulge} S 420 ${y}, 600 ${y}`}
        stroke={stroke}
        strokeWidth={1}
        fill="none"
        strokeDasharray="6 10"
        className="streamline"
        style={{ animationDelay: `${i * -1.7}s` }}
      />
    );
  });
  return (
    <svg viewBox="0 0 600 240" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {lines}
      {airfoil && (
        <path
          d="M212 124 C 240 96, 300 94, 372 104 C 400 108, 420 116, 428 124 C 400 128, 330 134, 270 134 C 240 134, 220 130, 212 124 Z"
          fill={tone === "light" ? "var(--blue)" : "var(--paper)"}
          stroke={strong}
          strokeWidth={1.4}
        />
      )}
      {airfoil && <path d="M196 124 h248" stroke={strong} strokeWidth={0.8} strokeDasharray="2 6" />}
    </svg>
  );
}
