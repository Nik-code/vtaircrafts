import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Logo } from "@/components/Logo";

export function Footer() {
  const meta = getMeta();

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-[1120px] px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-6 w-6 text-fg" />
              <span className="text-[17px] font-semibold tracking-[-0.01em]">VT Aircrafts</span>
            </div>
            <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-fg-2">
              An independent index of every aircraft on India&rsquo;s scheduled and non-scheduled operator permits, rebuilt
              monthly from DGCA&rsquo;s published lists.
            </p>
            <p className="mt-3 text-[13px] text-fg-3">Data as on {fmtDate(meta.snapshot)}.</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Browse</p>
            <ul className="space-y-2 text-[15px]">
              <li><Link href="/fleet" className="text-fg-2 hover:text-fg">Fleet</Link></li>
              <li><Link href="/operators" className="text-fg-2 hover:text-fg">Operators</Link></li>
              <li><Link href="/log" className="text-fg-2 hover:text-fg">Change log</Link></li>
              <li><Link href="/data" className="text-fg-2 hover:text-fg">Data and method</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Project</p>
            <ul className="space-y-2 text-[15px]">
              <li><a href="https://github.com/Nik-code/vtaircrafts" target="_blank" rel="noreferrer" className="text-fg-2 hover:text-fg">GitHub</a></li>
              <li><a href="https://priyanshnik.com" target="_blank" rel="noreferrer" className="text-fg-2 hover:text-fg">Made by Priyansh</a></li>
              <li><span className="text-fg-3">Code MIT, data CC BY 4.0</span></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-[13px] leading-relaxed text-fg-3">
          Not the Indian civil aircraft register. Not for operational or legal use. Photos are from Wikimedia Commons and
          credited on each aircraft page.
        </p>
      </div>
    </footer>
  );
}
