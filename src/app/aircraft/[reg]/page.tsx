import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getAircraftByReg, getEvents, getOperator } from "@/lib/data";
import { Plate } from "@/components/ui/Plate";
import { Placard } from "@/components/aircraft/Placard";
import { HistoryTimeline } from "@/components/aircraft/HistoryTimeline";
import { Siblings } from "@/components/aircraft/Siblings";

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
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="label mb-5 flex flex-wrap items-center gap-2">
        <Link href="/fleet" className="text-ink-2 hover:text-ink">Fleet</Link>
        <span className="text-ink-3">/</span>
        <Link href={`/operators/${a.operatorId}`} className="text-ink-2 hover:text-ink">{a.operator}</Link>
        <span className="text-ink-3">/</span>
        <span className="text-ink">{a.reg}</span>
      </div>

      <article className="sheet grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
        <Plate
          image={a.image}
          wing={a.wing}
          alt={`${a.reg} ${a.type.name}`}
          fig="01"
          caption={`${a.type.name} · ${a.operator}`}
          width={1280}
          eager
        />
        <Placard a={a} />
      </article>

      <HistoryTimeline aircraft={a} events={events} />

      <Siblings aircraft={a} operatorName={op?.name ?? a.operator} siblings={siblings} />
    </main>
  );
}
