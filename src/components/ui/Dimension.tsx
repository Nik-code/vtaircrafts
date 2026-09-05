import type { ReactNode } from "react";

/** A dimension line with end ticks and a centred value, like a drawing callout. */
export function Dimension({ children, className = "", tone = "ink" }: { children: ReactNode; className?: string; tone?: "ink" | "signal" | "light" }) {
  const color = tone === "signal" ? "text-signal" : tone === "light" ? "text-paper" : "text-ink";
  const line = tone === "light" ? "bg-paper/60" : tone === "signal" ? "bg-signal" : "bg-ink";
  return (
    <div className={`flex items-center gap-3 ${color} ${className}`}>
      <span className={`relative h-px flex-1 ${line}`}>
        <span className={`absolute left-0 top-1/2 h-2.5 w-px -translate-y-1/2 ${line}`} />
      </span>
      <span className="label min-w-0 shrink text-center" style={{ color: "inherit" }}>{children}</span>
      <span className={`relative h-px flex-1 ${line}`}>
        <span className={`absolute right-0 top-1/2 h-2.5 w-px -translate-y-1/2 ${line}`} />
      </span>
    </div>
  );
}
