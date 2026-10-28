import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getAircraftByReg, getArchive, getArchivedByReg, getEventsFor, getMeta, getOperator } from "@/lib/data";
import { ageOf } from "@/lib/registry";
import { answersFor, archivedAnswersFor, faqJsonLd } from "@/lib/answers";
import { Container } from "@/components/ui/Container";
import { Photo, PhotoCredit } from "@/components/ui/Photo";
import { Placard } from "@/components/aircraft/Placard";
import { ArchivedPlacard, archivedSummary } from "@/components/aircraft/ArchivedPlacard";
import { HistoryTimeline } from "@/components/aircraft/HistoryTimeline";
import { Siblings } from "@/components/aircraft/Siblings";
import { Answers } from "@/components/aircraft/Answers";
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
    const ans = answersFor(a);
    return {
      title: { absolute: ans.title },
      description: ans.description,
      alternates: { canonical },
      openGraph: { title: ans.title, description: ans.description, ...(a.image ? { images: [{ url: a.image.src }] } : {}) },
    };
  }
  const h = getArchivedByReg(reg);
  if (!h) return { title: reg };
  const ans = archivedAnswersFor(h, archivedSummary(h));
  return {
    title: { absolute: ans.title },
    description: ans.description,
    alternates: { canonical },
    openGraph: { title: ans.title, description: ans.description },
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
  const ans = answersFor(a);

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
            description: ans.lede,
            dateModified: getMeta().generatedAt,
            about: {
              "@type": "Product",
              name: `${a.type.name} ${a.reg}`,
              identifier: a.reg,
              manufacturer: { "@type": "Organization", name: a.type.manufacturer },
              ...(a.history?.msn ? { serialNumber: a.history.msn } : {}),
              ...(a.image ? { image: a.image.src } : {}),
            },
          },
          faqJsonLd(ans.answers),
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
          <p className="lede mt-5 max-w-[64ch]">{ans.lede}</p>
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
        <Answers reg={a.reg} answers={ans.answers} />
        <Siblings aircraft={a} operatorName={op?.name ?? a.operator} siblings={siblings} />
      </Container>
    </main>
  );
}

function ArchivedAircraftPage({ reg }: { reg: string }) {
  const h = getArchivedByReg(reg)!;
  const s = archivedSummary(h);
  const ans = archivedAnswersFor(h, s);
  const last = h.stints.at(-1);
  const firstSeen = h.stints.map((x) => x.start.to).sort()[0] ?? null;

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={[
          breadcrumbs([
            ["Fleet", "/fleet"],
            ...(last ? ([[last.operator, `/operators/${last.operatorId}`]] as Array<[string, string]>) : []),
            [h.reg, `/aircraft/${h.reg}`],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemPage",
            name: `${h.reg}, ${h.type.name}`,
            url: `https://vtaircrafts.in/aircraft/${h.reg}`,
            description: ans.lede,
            dateModified: getMeta().generatedAt,
          },
          faqJsonLd(ans.answers),
        ]}
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
        <Answers reg={h.reg} answers={ans.answers} />
      </Container>
    </main>
  );
}
