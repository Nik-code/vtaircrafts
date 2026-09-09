import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "teal" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-bg-3 text-fg-2",
  accent: "bg-accent-soft text-accent",
  teal: "bg-teal-soft text-teal",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={`badge ${TONES[tone]} ${className}`}>{children}</span>;
}

/** The permit class an operator holds: scheduled or non-scheduled. */
export function ListBadge({ scheduled, short = false, className = "" }: { scheduled: boolean; short?: boolean; className?: string }) {
  const label = scheduled ? (short ? "Sch" : "Scheduled") : short ? "NSOP" : "Non-scheduled";
  return (
    <Badge tone={scheduled ? "neutral" : "teal"} className={className}>
      {label}
    </Badge>
  );
}
