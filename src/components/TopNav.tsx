import Link from "next/link";

const links = [
  { href: "/fleet", label: "Fleet" },
  { href: "/operators", label: "Operators" },
  { href: "/log", label: "Log" },
  { href: "/data", label: "Data" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-accent text-[11px] font-bold text-black mono">VT</span>
          <span className="display text-[17px] tracking-tight">
            aircrafts<span className="text-fg-dim">.in</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="label rounded-sm px-2.5 py-1.5 text-fg-muted transition hover:bg-bg-panel hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/Nik-code/vtaircrafts"
            target="_blank"
            rel="noreferrer"
            className="label hidden rounded-sm border border-line px-2.5 py-1.5 text-fg-muted transition hover:border-line-strong hover:text-fg sm:inline-block"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
