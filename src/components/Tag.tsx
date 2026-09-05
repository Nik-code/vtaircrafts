export function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "teal" | "red" | "dim" }) {
  const cls =
    tone === "accent" ? "border-accent/50 text-accent bg-accent-soft"
    : tone === "teal" ? "border-teal/40 text-teal bg-teal-soft"
    : tone === "red" ? "border-red/50 text-red"
    : tone === "dim" ? "border-line text-fg-dim"
    : "border-line-strong text-fg-muted";
  return <span className={`label inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] ${cls}`}>{children}</span>;
}
