"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_LINKS = [
  { href: "/fleet", label: "Fleet" },
  { href: "/operators", label: "Operators" },
  { href: "/log", label: "Log" },
  { href: "/data", label: "Data" },
] as const;

/** Primary navigation. `variant` picks the desktop inline row or the mobile tab row. */
export function NavLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/operators" && pathname.startsWith("/aircraft"));

  if (variant === "mobile") {
    return (
      <nav aria-label="Primary" className="grid grid-cols-4 border-t border-line sm:hidden">
        {NAV_LINKS.map((l) => {
          const on = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex h-11 items-center justify-center text-[15px] font-medium ${on ? "text-fg" : "text-fg-2"}`}
            >
              {l.label}
              {on && <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
      {NAV_LINKS.map((l) => {
        const on = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors ${on ? "bg-bg-3 text-fg" : "text-fg-2 hover:text-fg"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
