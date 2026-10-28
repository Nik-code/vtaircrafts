import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtInt } from "@/lib/format";
import { getRegister } from "@/lib/registry";
import { Container, PageHeader } from "@/components/ui/Container";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export function generateStaticParams() {
  return [...getRegister().keys()].map((letter) => ({ letter }));
}

export async function generateMetadata({ params }: PageProps<"/register/[letter]">): Promise<Metadata> {
  const { letter } = await params;
  const list = getRegister().get(letter);
  if (!list) return {};
  const L = letter.toUpperCase();
  return {
    title: `VT-${L} registrations: owner and operator of every aircraft`,
    description: `All ${fmtInt(list.length)} Indian registrations from ${list[0].reg} to ${list.at(-1)!.reg}, with type, operator, owner and history from DGCA's lists.`,
    alternates: { canonical: `/register/${letter}` },
  };
}

export default async function RegisterLetterPage({ params }: PageProps<"/register/[letter]">) {
  const { letter } = await params;
  const register = getRegister();
  const list = register.get(letter);
  if (!list) notFound();
  const L = letter.toUpperCase();
  const current = list.filter((e) => e.current).length;

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={breadcrumbs([
          ["Register", "/register"],
          [`VT-${L}`, `/register/${letter}`],
        ])}
      />
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/register" className="hover:text-fg">Register</Link>
        </nav>
        <PageHeader
          eyebrow={`${fmtInt(list.length)} registrations · ${fmtInt(current)} on a permit today`}
          title={`VT-${L}`}
          lede={`Indian registrations from ${list[0].reg} to ${list.at(-1)!.reg}. Each page has the type, operator, registered owner and history from DGCA's records.`}
        />
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Letters">
          {[...register.keys()].map((l) => (
            <Link key={l} href={`/register/${l}`} className={`chip mono ${l === letter ? "chip-on" : ""}`} aria-current={l === letter ? "page" : undefined}>
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
        <ul className="mt-10 grid gap-x-10 border-t border-line sm:grid-cols-2">
          {list.map((e) => (
            <li key={e.reg} className="flex min-w-0 items-baseline gap-4 border-b border-line py-3">
              <Link href={`/aircraft/${e.reg}`} className="mono w-[5.5rem] shrink-0 text-[15px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                {e.reg}
              </Link>
              <span className="min-w-0 text-[14px] leading-snug">
                <span className="text-fg">{e.type}</span>
                <span className={e.current ? "text-fg-2" : "text-fg-3"}> · {e.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
