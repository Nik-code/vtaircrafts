import type { ReactNode } from "react";

export type StampTone = "ink" | "signal" | "mint" | "caution" | "dim" | "light";

export function Stamp({ children, tone = "ink", className = "" }: { children: ReactNode; tone?: StampTone; className?: string }) {
  const cls =
    tone === "signal" ? "text-signal"
    : tone === "mint" ? "text-mint"
    : tone === "caution" ? "text-caution"
    : tone === "dim" ? "text-ink-3"
    : tone === "light" ? "text-paper"
    : "text-ink";
  return <span className={`stamp inline-flex items-center ${cls} ${className}`}>{children}</span>;
}
