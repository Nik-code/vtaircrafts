import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getAircraftByReg, getArchive, getArchivedByReg, getEnrichment, getEventsFor, getOperator } from "@/lib/data";
import { ageOf, builtYear } from "@/lib/registry";
import { Container } from "@/components/ui/Container";
import { Photo, PhotoCredit } from "@/components/ui/Photo";
import { Placard } from "@/components/aircraft/Placard";
import { ArchivedPlacard, archivedSummary } from "@/components/aircraft/ArchivedPlacard";
import { HistoryTimeline } from "@/components/aircraft/HistoryTimeline";
import { Siblings } from "@/components/aircraft/Siblings";
import { Badge, ListBadge } from "@/components/ui/Badge";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export function generateStaticParams() {
  return [...getAircraft().map((a) => ({ reg: a.reg })), ...getArchive().map((a) => ({ reg: a.reg }))];
}

export async function generateMetadata({ params }: PageProps<"/aircraft/[reg]">): Promise<Metadata> {
  const { reg } = await params;
  const canonical = `/aircraft/${reg}`;
  const a = getAircraftByReg(reg);
  if (a) {
    const built = builtYear(a);
    const msn = a.history?.msn ?? getEnrichment(a.reg)?.msn;
    const title = [`${a.reg}: ${a.operator} ${a.type.name}`, msn && `MSN ${msn}`, built && `built ${built.year}`].filter(Boolean).join(", ");
    const facts = [
      `${a.reg} is a ${a.type.name} on ${a.operator}'s ${a.category} permit${a.permit.no ? ` ${a.permit.no}` : ""}`,
      a.history?.registeredOn && `registered in India on ${a.history.registeredOn}`,
      a.history?.owner && `owned by ${a.history.owner.replace(/^M\/S\.?\s*/i, "").split(",")[0].trim()}`,
      a.seats && `${a.seats} seats`,
    ].filter(Boolean);
    return {
      title: { absolute: `${title} · VT Aircrafts` },
      description: `${facts.join(", ")}. From DGCA's published lists.`,
      alternates: { canonical },
      openGraph: a.image ? { images: [{ url: a.image.src }] } : undefined,
    };
  }
  const h = getArchivedByReg(reg);
  if (!h) return { title: reg };
  const s = archivedSummary(h);
  return {
    title: { absolute: `${h.reg}: ${s.headline} · VT Aircrafts` },
    description: `${h.reg} ${s.sentence} From DGCA registration reports and operator lists.`,
    alternates: { canonical },
  };
}

export default async function AircraftPage({ params }: PageProps<"/aircraft/[reg]">) {
  const { reg } = await params;
  const a = getAircraftByReg(reg);
  if (!a) {
    const h = getArchivedByReg(reg);
    if (!h) notFound();
    return <ArchivedAircraftPage reg={reg} />;
  }
  const op = getOperator(a.operatorId);
  const siblings = getAircraft().filter((x) => x.operatorId === a.operatorId && x.type.name === a.type.name && x.reg !== a.reg);
  const age = ageOf(a);

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={[
          breadcrumbs([
            ["Fleet", "/fleet"],
            [a.operator, `/operators/${a.operatorId}`],
            [a.reg, `/aircraft/${a.reg}`],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemPage",
            name: `${a.reg}, ${a.type.name}, ${a.operator}`,
            url: `https://vtaircrafts.in/aircraft/${a.reg}`,
            about: {
              "@type": "Product",
              name: `${a.type.name} ${a.reg}`,
              identifier: a.reg,
              manufacturer: { "@type": "Organization", name: a.type.manufacturer },
              ...(a.history?.msn ? { serialNumber: a.history.msn } : {}),
              ...(a.image ? { image: a.image.src } : {}),
            },
          },
        ]}
      />
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
            {age != null && <span className="text-fg-3"> · {age === 0 ? "new this year" : `${age} ${age === 1 ? "year" : "years"} old`}</span>}
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <div>
            <Photo image={a.image} wing={a.wing} alt={`${a.reg} ${a.type.name}`} width={1280} eager />
            {a.image && <PhotoCredit image={a.image} className="mt-3" />}
          </div>
          <Placard a={a} />
        </div>

        <HistoryTimeline
          aircraft={{
            reg: a.reg,
            registeredOn: a.history?.registeredOn ?? null,
            owner: a.history?.owner ?? null,
            msn: a.history?.msn ?? null,
            firstSeen: a.history?.firstSnapshot ?? a.firstSeen,
          }}
          events={getEventsFor(a.reg)}
        />
        <Siblings aircraft={a} operatorName={op?.name ?? a.operator} siblings={siblings} />
      </Container>
    </main>
  );
}

function ArchivedAircraftPage({ reg }: { reg: string }) {
  const h = getArchivedByReg(reg)!;
  const s = archivedSummary(h);
  const last = h.stints.at(-1);
  const firstSeen = h.stints.map((x) => x.start.to).sort()[0] ?? null;

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={breadcrumbs([
          ["Fleet", "/fleet"],
          ...(last ? ([[last.operator, `/operators/${last.operatorId}`]] as Array<[string, string]>) : []),
          [h.reg, `/aircraft/${h.reg}`],
        ])}
      />
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/fleet" className="hover:text-fg">Fleet</Link>
          <span aria-hidden>/</span>
          {h.training ? <Link href={`/flying-schools/${h.training.ftoId}`} className="hover:text-fg">{h.training.fto}</Link> : <span>Archive</span>}
        </nav>

        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display mono text-[clamp(40px,10vw,72px)] font-bold tracking-[-0.03em]">{h.reg}</h1>
            <Badge className="mt-2">{s.badge}</Badge>
          </div>
          <p className="mt-3 text-[clamp(18px,2.5vw,24px)] leading-snug text-fg-2">{s.headline}</p>
          <p className="lede mt-5 max-w-[64ch]">
            {h.reg} {s.sentence} It is not on any scheduled or non-scheduled operator permit today.
          </p>
        </header>

        <div className="mt-10">
          <ArchivedPlacard a={h} />
        </div>

        <HistoryTimeline
          aircraft={{ reg: h.reg, registeredOn: h.registeredOn, owner: h.owner, msn: h.msn, firstSeen }}
          events={getEventsFor(h.reg)}
        />
      </Container>
    </main>
  );
}
