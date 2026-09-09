import type { ReactNode } from "react";

/** Page column: 1120px wide, comfortable gutters on every screen. */
export function Container({ children, className = "", wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={`mx-auto w-full ${wide ? "max-w-[1400px]" : "max-w-[1120px]"} px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** Page title block: optional eyebrow, a title, optional lede. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  aside,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
        {lede && <p className="lede mt-4 max-w-[60ch]">{lede}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}

/** Section heading with an optional count or action on the right. */
export function SectionHeader({ title, meta, action, className = "" }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="h2">{title}</h2>
        {meta && <span className="num text-[15px] text-fg-3">{meta}</span>}
      </div>
      {action}
    </div>
  );
}
