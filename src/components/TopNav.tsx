import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SearchPalette } from "@/components/search/SearchPalette";

const links = [
  { href: "/fleet", label: "Fleet" },
  { href: "/operators", label: "Operators" },
  { href: "/log", label: "Log" },
  { href: "/data", label: "Data" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-[1440px] items-stretch px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 border-r border-ink pr-4">
          <Logo className="h-[22px] w-[22px] shrink-0 text-ink" />
          <span className="stencil text-[19px] leading-none">VT<span className="text-signal">·</span>AIRCRAFTS</span>
        </Link>
        <nav className="ml-2 hidden items-stretch sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="label flex items-center border-r border-rule px-4 text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchPalette />
          <a href="https://github.com/Nik-code/vtaircrafts" target="_blank" rel="noreferrer" className="label hidden text-ink-2 hover:text-ink md:inline">GitHub ↗</a>
        </div>
      </div>
      <nav className="flex border-t border-rule sm:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="label flex flex-1 items-center justify-center border-r border-rule py-2 last:border-r-0">{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
