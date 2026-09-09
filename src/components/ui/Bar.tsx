/** A thin proportional bar. ratio in [0, 1]. */
export function Bar({ ratio, tone = "fg", className = "" }: { ratio: number; tone?: "fg" | "accent" | "teal"; className?: string }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const fill = tone === "accent" ? "bg-accent" : tone === "teal" ? "bg-teal" : "bg-fg";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-bg-3 ${className}`} aria-hidden>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
