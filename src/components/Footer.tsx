import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";

/** Thin drawing title block. One row, wraps on mobile. */
export function Footer() {
  const meta = getMeta();
  const rev = fmtDate(meta.snapshot);

  return (
    <footer className="border-t border-ink">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
          <p className="mono text-[11px] text-ink-2">
            Drawn from DGCA operator lists · Rev {rev} · Code MIT · Data CC BY 4.0 · Photos Wikimedia Commons,
            credited per image
          </p>
          <div className="flex items-center gap-4">
            <Link href="/data" className="label hover:text-ink">Data &amp; method</Link>
            <a href="https://github.com/Nik-code/vtaircrafts" target="_blank" rel="noreferrer" className="label hover:text-ink">
              GitHub ↗
            </a>
            <ButtonLink
              href="https://priyanshnik.com"
              tone="ghost"
              external
              className="px-2.5 py-1 text-[10px]"
            >
              Creator portfolio ↗
            </ButtonLink>
          </div>
        </div>
        <p className="pb-3 text-[11px] text-ink-3">
          An independent index, not the Indian civil aircraft register. Not for operational or legal use.
        </p>
      </div>
    </footer>
  );
}
