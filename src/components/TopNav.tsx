import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { SearchPalette } from "@/components/search/SearchPalette";
import { ThemeToggle } from "@/components/ThemeToggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-fg">
          <Logo className="h-6 w-6 shrink-0" />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">VT Aircrafts</span>
        </Link>
        <div className="ml-4">
          <NavLinks variant="desktop" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <SearchPalette />
          <ThemeToggle />
        </div>
      </div>
      <NavLinks variant="mobile" />
    </header>
  );
}
