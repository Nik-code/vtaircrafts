import type { ReactNode } from "react";

/**
 * Drawing-sheet title block used as a section or page header.
 * Fields render as small labelled cells; the title is set in condensed caps.
 */
export function TitleBlock({
  sheet,
  title,
  fields = [],
  right,
  as: Tag = "h1",
  className = "",
}: {
  sheet?: string;
  title: string;
  fields?: Array<{ label: string; value: ReactNode }>;
  right?: ReactNode;
  as?: "h1" | "h2" | "h3" | "div";
  className?: string;
}) {
  return (
    <div className={`border-y border-ink ${className}`}>
      <div className="grid grid-cols-[auto_1fr_auto] items-stretch divide-x divide-ink">
        {sheet ? (
          <div className="flex flex-col justify-center px-3 py-2">
            <span className="label label-dim">Sheet</span>
            <span className="mono text-sm">{sheet}</span>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center px-4 py-2">
          <Tag className="stencil text-2xl leading-none sm:text-3xl">{title}</Tag>
        </div>
        <div className="flex divide-x divide-ink">
          {fields.map((f) => (
            <div key={f.label} className="hidden flex-col justify-center px-3 py-2 sm:flex">
              <span className="label label-dim">{f.label}</span>
              <span className="mono text-sm">{f.value}</span>
            </div>
          ))}
          {right ? <div className="flex items-center px-3">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}
