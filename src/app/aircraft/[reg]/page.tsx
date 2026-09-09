import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getAircraftByReg, getEvents, getOperator } from "@/lib/data";
import { Container } from "@/components/ui/Container";
import { Photo, PhotoCredit } from "@/components/ui/Photo";
import { Placard } from "@/components/aircraft/Placard";
import { HistoryTimeline } from "@/components/aircraft/HistoryTimeline";
import { Siblings } from "@/components/aircraft/Siblings";
import { ListBadge } from "@/components/ui/Badge";

export function generateStaticParams() {
  return getAircraft().map((a) => ({ reg: a.reg }));
}

export async function generateMetadata({ params }: PageProps<"/aircraft/[reg]">): Promise<Metadata> {
  const { reg } = await params;
  const a = getAircraftByReg(reg);
  if (!a) return { title: reg };
  return {
    title: `${a.reg} · ${a.type.name} · ${a.operator}`,
    description: `${a.reg} is a ${a.type.name} operated by ${a.operator} under ${a.category} permit ${a.permit.no ?? ""}.`,
    openGraph: a.image ? { images: [{ url: a.image.src }] } : undefined,
  };
}

export default async function AircraftPage({ params }: PageProps<"/aircraft/[reg]">) {
  const { reg } = await params;
  const a = getAircraftByReg(reg);
  if (!a) notFound();
  const op = getOperator(a.operatorId);
  const siblings = getAircraft().filter((x) => x.operatorId === a.operatorId && x.type.name === a.type.name && x.reg !== a.reg);
  const events = getEvents();

  return (
    <main className="py-10 sm:py-14">
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/fleet" className="hover:text-fg">Fleet</Link>
          <span aria-hidden>/</span>
          <Link href={`/operators/${a.operatorId}`} className="hover:text-fg">{a.operator}</Link>
        </nav>

        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display mono text-[clamp(40px,10vw,72px)] font-bold tracking-[-0.03em]">{a.reg}</h1>
            <ListBadge scheduled={a.category === "scheduled"} className="mt-2" />
          </div>
          <p className="mt-3 text-[clamp(18px,2.5vw,24px)] leading-snug text-fg-2">
            {a.type.name} · <Link href={`/operators/${a.operatorId}`} className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">{a.operator}</Link>
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <div>
            <Photo image={a.image} wing={a.wing} alt={`${a.reg} ${a.type.name}`} width={1280} eager />
            {a.image && <PhotoCredit image={a.image} className="mt-3" />}
          </div>
          <Placard a={a} />
        </div>

        <HistoryTimeline aircraft={a} events={events} />
        <Siblings aircraft={a} operatorName={op?.name ?? a.operator} siblings={siblings} />
      </Container>
    </main>
  );
}
