import { ButtonLink } from "@/components/ui/Button";

const STEPS = [
  {
    title: "DGCA publishes",
    body: "Two PDFs list every aircraft on a scheduled or non-scheduled operator permit, reissued as the lists change.",
  },
  {
    title: "Positional parsing",
    body: "Word positions are read off each page and the printed columns are rebuilt, so a tail number split across two lines is joined back together.",
  },
  {
    title: "Monthly snapshot",
    body: "Each build is kept whole and compared with the one before it, which is where the movements on this sheet come from.",
  },
];

export function HowDrawn() {
  return (
    <>
      <ol className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="bg-paper px-4 py-5">
            <div className="flex items-baseline gap-3">
              <span className="display-num text-2xl text-signal">{String(i + 1).padStart(2, "0")}</span>
              <span className="stencil text-base">{s.title}</span>
            </div>
            <p className="mt-2 text-[14px] leading-snug text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="mono text-[11.5px] text-ink-3">Sources, checksums and the raw files are listed on the data sheet.</p>
        <ButtonLink href="/data">Data and method</ButtonLink>
      </div>
    </>
  );
}
