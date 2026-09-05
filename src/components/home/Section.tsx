import type { ReactNode } from "react";
import { TitleBlock } from "@/components/ui/TitleBlock";

/** A numbered section of the summary sheet: title block, then its drawing. */
export function Section({
  id,
  sheet,
  title,
  fields,
  right,
  children,
}: {
  id?: string;
  sheet: string;
  title: string;
  fields?: Array<{ label: string; value: ReactNode }>;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-14">
      <TitleBlock as="h2" sheet={sheet} title={title} fields={fields} right={right} />
      <div className="px-4 py-7 sm:px-6 sm:py-9">{children}</div>
    </section>
  );
}
