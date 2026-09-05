export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "orange" | "teal" | "none";
}) {
  const color = accent === "orange" ? "text-accent" : accent === "teal" ? "text-teal" : "text-fg";
  return (
    <div className="frame hairline bg-bg-elev p-4 sm:p-5">
      <div className="label mb-3 flex items-center gap-2">
        <span className={`inline-block h-1.5 w-1.5 ${accent === "teal" ? "bg-teal" : "bg-accent"}`} />
        {label}
      </div>
      <div className={`display text-4xl sm:text-5xl ${color}`}>{value}</div>
      {sub && <div className="mono mt-2 text-xs text-fg-muted">{sub}</div>}
    </div>
  );
}
