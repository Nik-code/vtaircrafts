import Link from "next/link";
import type { ReactNode } from "react";

const base = "stamp inline-flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors duration-150";
const tones = {
  ink: "border-ink text-ink hover:bg-ink hover:text-paper",
  signal: "border-signal text-signal hover:bg-signal hover:text-paper",
  ghost: "border-rule-2 text-ink-2 hover:border-ink hover:text-ink",
};

export function ButtonLink({ href, children, tone = "ink", className = "", external = false }: { href: string; children: ReactNode; tone?: keyof typeof tones; className?: string; external?: boolean }) {
  const cls = `${base} ${tones[tone]} ${className}`;
  if (external) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>;
  return <Link href={href} className={cls}>{children}</Link>;
}

export function Button({ children, tone = "ink", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof tones }) {
  return <button className={`${base} ${tones[tone]} ${className}`} {...rest}>{children}</button>;
}
