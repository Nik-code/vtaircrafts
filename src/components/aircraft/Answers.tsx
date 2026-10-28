import type { Answer } from "@/lib/answers";
import { regVariants } from "@/lib/answers";
import { SectionHeader } from "@/components/ui/Container";

/** The common questions about a registration, answered in one sentence each from DGCA's records. */
export function Answers({ reg, answers }: { reg: string; answers: Answer[] }) {
  if (answers.length === 0) return null;
  return (
    <section className="mt-16">
      <SectionHeader title={`About ${reg}`} />
      <dl className="divide-y divide-line border-y border-line">
        {answers.map((x) => (
          <div key={x.q} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8">
            <dt className="text-[15px] font-medium text-fg">{x.q}</dt>
            <dd className="text-[15px] leading-relaxed text-fg-2">{x.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[13px] text-fg-3">Also written {regVariants(reg).join(" or ")}.</p>
    </section>
  );
}
