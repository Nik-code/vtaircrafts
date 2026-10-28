import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getIndex, getMeta } from "@/lib/data";
import { getRegister } from "@/lib/registry";
import { fmtDate, fmtInt } from "@/lib/format";
import { FleetExplorer } from "@/components/fleet/FleetExplorer";
import { Container, PageHeader } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Fleet",
  description: "Search and filter every aircraft on an Indian scheduled or non-scheduled operator permit.",
  alternates: { canonical: "/fleet" },
};

export default function FleetPage() {
  const total = getIndex().length;
  const meta = getMeta();
  return (
    <main className="py-10 sm:py-14">
      <Container wide>
        <PageHeader
          eyebrow={`${fmtInt(total)} aircraft · as on ${fmtDate(meta.snapshot)}`}
          title="Fleet"
          lede="Every aircraft on the DGCA scheduled and non-scheduled operator lists. Filters live in the address bar, so a view can be shared."
        />
        <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="Registrations A to Z">
          <Link href="/register" className="mr-2 text-[14px] text-fg-3 hover:text-fg">Registrations A to Z</Link>
          {[...getRegister().keys()].map((l) => (
            <Link key={l} href={`/register/${l}`} className="chip mono">
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </Container>
      <div className="mt-10">
        <Suspense fallback={<Container wide><p className="text-fg-3">Loading the index… <Link href="/register" className="underline underline-offset-4">Browse every registration A to Z</Link>.</p></Container>}>
          <FleetExplorer total={total} />
        </Suspense>
      </div>
    </main>
  );
}
