import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtDate } from "@/lib/format";

/** Drawing title block. Sits at the bottom of every sheet. */
export function Footer() {
  const meta = getMeta();
  const cells: Array<[string, React.ReactNode]> = [
    ["Drawn from", "DGCA operator lists"],
    ["Rev", fmtDate(meta.snapshot)],
    ["Generated", fmtDate(meta.generatedAt.slice(0, 10))],
    ["Licence", "Code MIT · Data CC BY 4.0"],
    ["Photos", "Wikimedia Commons, credited per image"],
  ];
  return (
    <footer className="mt-20 border-t border-ink">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="grid grid-cols-2 divide-x divide-y divide-ink border-x border-b border-ink md:grid-cols-5 md:divide-y-0">
          {cells.map(([k, v]) => (
            <div key={k} className="px-3 py-3">
              <div className="label label-dim">{k}</div>
              <div className="mono mt-1 text-xs">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-ink-2">
          <p className="max-w-2xl">
            An independent index, not the Indian civil aircraft register. Source material © Directorate General of Civil
            Aviation, reproduced with acknowledgement. Not for operational or legal use.
          </p>
          <div className="flex gap-4">
            <Link href="/data" className="label hover:text-ink">Data & method</Link>
            <a href="https://github.com/Nik-code/vtaircrafts" target="_blank" rel="noreferrer" className="label hover:text-ink">GitHub ↗</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
