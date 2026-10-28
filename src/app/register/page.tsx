import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { getRegister } from "@/lib/registry";
import { Container, PageHeader } from "@/components/ui/Container";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "VT registrations A to Z",
  description:
    "Every Indian VT- registration on VT Aircrafts, A to Z: aircraft on airline and charter permits today, flying school trainers and deregistered aircraft, with owner and operator.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  const register = getRegister();
  const total = [...register.values()].reduce((n, l) => n + l.length, 0);
  return (
    <main className="py-10 sm:py-14">
      <JsonLd data={breadcrumbs([["Register", "/register"]])} />
      <Container>
        <PageHeader
          eyebrow={`${fmtInt(total)} registrations · as on ${fmtDate(getMeta().snapshot)}`}
          title="VT registrations A to Z"
          lede="Every registration with a page here, by the first letter after VT-. Aircraft on an operator permit today, flying school trainers, and aircraft that have left the Indian register."
        />
        <ul className="mt-10 grid grid-cols-3 border-l border-t border-line sm:grid-cols-6 lg:grid-cols-9">
          {[...register.entries()].map(([letter, list]) => (
            <li key={letter} className="border-b border-r border-line">
              <Link href={`/register/${letter}`} className="flex flex-col gap-1 p-4 hover:bg-bg-2">
                <span className="mono text-[22px] font-semibold">VT-{letter.toUpperCase()}</span>
                <span className="num text-[13px] text-fg-3">{fmtInt(list.length)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
