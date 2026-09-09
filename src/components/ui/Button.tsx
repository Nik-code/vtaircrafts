import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "primary" | "secondary";
type Size = "md" | "sm";

function cls(tone: Tone, size: Size, extra: string) {
  return `btn ${tone === "primary" ? "btn-primary" : "btn-secondary"} ${size === "sm" ? "btn-sm" : ""} ${extra}`;
}

export function ButtonLink({
  href,
  children,
  tone = "secondary",
  size = "md",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
  external?: boolean;
}) {
  const c = cls(tone, size, className);
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={c}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={c}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  tone = "secondary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: Size }) {
  return (
    <button className={cls(tone, size, className)} {...rest}>
      {children}
    </button>
  );
}
