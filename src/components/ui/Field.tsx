/** A label over a value. The building block of every fact list on the site. */
export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[13px] font-medium text-fg-3">{label}</dt>
      <dd className="mt-1 break-words text-[15px] leading-snug text-fg">{children}</dd>
    </div>
  );
}
