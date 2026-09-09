import Link from "next/link";
import { getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Container, SectionHeader } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { Bar } from "@/components/ui/Bar";
import { ListBadge } from "@/components/ui/Badge";
import { Photo } from "@/components/ui/Photo";
import { eventLabel, eventTone } from "@/components/log/eventFormat";
import { Badge } from "@/components/ui/Badge";
import { operatorsBySize, plateSelection, recentMovements, typeCount, typeRows } from "@/components/home/derive";

const TOP_OPERATORS = 8;
const TOP_TYPES = 8;

export default function Home() {
  const meta = getMeta();
  const revision = meta.sources[0]?.asOn ?? meta.snapshot;
  const operators = operatorsBySize(getOperators());
  const types = typeRows();
  const maxOperator = operators[0]?.fleetCount ?? 1;
  const maxType = types[0]?.count ?? 1;
  const photos = plateSelection(6);
  const movements = recentMovements(6);

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-line">
        <Container className="py-16 sm:py-24">
          <p className="eyebrow">India · commercial fleet · as on {fmtDate(revision)}</p>
          <div className="display mt-4 text-[clamp(88px,22vw,200px)]">
            <CountUp value={meta.counts.aircraft} duration={900} />
          </div>
          <h1 className="mt-6 max-w-[34ch] text-[clamp(22px,3.2vw,32px)] font-medium leading-[1.3] tracking-[-0.02em] text-fg">
            aircraft on India&rsquo;s scheduled and non-scheduled operator permits, rebuilt every month from DGCA&rsquo;s own lists.
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/fleet" tone="primary">Browse the fleet</ButtonLink>
            <ButtonLink href="/operators">Operators</ButtonLink>
            <ButtonLink href="/data">Download the data</ButtonLink>
          </div>
        </Container>
      </section>

      {/* At a glance */}
      <section className="border-b border-line">
        <Container>
          <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            <Stat label="Scheduled" value={meta.counts.scheduled} hint="airline fleets" />
            <Stat label="Non-scheduled" value={meta.counts.nonScheduled} hint="charter, corporate, aerial work" />
            <Stat label="Operators" value={meta.counts.operators} hint="permit holders" />
            <Stat label="Types" value={typeCount()} hint={`${fmtInt(meta.counts.rotary)} rotary wing`} />
          </dl>
        </Container>
      </section>

      {/* Operators and types */}
      <section>
        <Container className="grid gap-16 py-16 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHeader
              title="Largest operators"
              action={<Link href="/operators" className="text-[15px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">All {fmtInt(operators.length)} operators</Link>}
            />
            <ol className="divide-y divide-line">
              {operators.slice(0, TOP_OPERATORS).map((o) => (
                <li key={o.id}>
                  <Link href={`/operators/${o.id}`} className="row -mx-3 block rounded-[var(--radius-sm)] px-3 py-3.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="flex min-w-0 items-baseline gap-2.5">
                        <span className="truncate text-[17px] font-medium">{o.name}</span>
                        <ListBadge scheduled={o.category === "scheduled"} short className="hidden sm:inline-flex" />
                      </span>
                      <span className="num shrink-0 text-[17px] font-semibold">{fmtInt(o.fleetCount)}</span>
                    </div>
                    <Bar ratio={o.fleetCount / maxOperator} className="mt-2.5" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <SectionHeader
              title="Most common types"
              action={<Link href="/fleet?view=table&sort=type" className="text-[15px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">All {fmtInt(types.length)} types</Link>}
            />
            <ol className="divide-y divide-line">
              {types.slice(0, TOP_TYPES).map((t) => (
                <li key={t.name}>
                  <Link href={`/fleet?t=${encodeURIComponent(t.name)}`} className="row -mx-3 block rounded-[var(--radius-sm)] px-3 py-3.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="flex min-w-0 items-baseline gap-2.5">
                        <span className="truncate text-[17px] font-medium">{t.name}</span>
                        {t.icao && <span className="mono hidden text-[13px] text-fg-3 sm:inline">{t.icao}</span>}
                      </span>
                      <span className="num shrink-0 text-[17px] font-semibold">{fmtInt(t.count)}</span>
                    </div>
                    <Bar ratio={t.count / maxType} tone={t.wing === "RW" ? "teal" : "fg"} className="mt-2.5" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Photos */}
      <section className="border-t border-line">
        <Container className="py-16 sm:py-20">
          <SectionHeader
            title="From the fleet"
            action={<Link href="/fleet?view=plates" className="text-[15px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">Photo view</Link>}
          />
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
            {photos.map((a, i) => (
              <li key={a.reg} className="min-w-0">
                <Link href={`/aircraft/${a.reg}`} className="group block">
                  <Photo image={a.image} wing={a.wing} alt={`${a.reg}, a ${a.type.name} of ${a.operator}`} width={960} aspect="aspect-[4/3]" eager={i < 3} className="transition-opacity group-hover:opacity-90" />
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="mono text-[15px] font-medium">{a.reg}</span>
                    <span className="truncate text-[14px] text-fg-3">{a.operator}</span>
                  </div>
                  <p className="truncate text-[14px] text-fg-2">{a.type.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Recent changes */}
      <section className="border-t border-line">
        <Container className="py-16 sm:py-20">
          <SectionHeader
            title="Recent changes"
            action={<Link href="/log" className="text-[15px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">Full change log</Link>}
          />
          <ul className="divide-y divide-line">
            {movements.map((e) => {
              const when = e.date ? fmtDate(e.date) : e.to ? `by ${fmtDate(e.to)}` : "";
              const line = e.kind === "moved"
                ? `${e.fromOperator ?? "Unknown"} to ${e.toOperator ?? "unknown"}`
                : [e.type ?? e.model, e.operator ?? e.toOperator ?? e.fromOperator].filter(Boolean).join(" · ");
              return (
                <li key={e.id}>
                  <Link href={`/aircraft/${e.reg}`} className="row -mx-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-[var(--radius-sm)] px-3 py-3.5">
                    <span className="mono w-[5.5rem] shrink-0 text-[15px] font-medium">{e.reg}</span>
                    <Badge tone={eventTone(e.kind)}>{eventLabel(e.kind)}</Badge>
                    <span className="min-w-0 flex-1 basis-[16rem] truncate text-[15px] text-fg-2">{line}</span>
                    <span className="num text-[14px] text-fg-3">{when}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* About */}
      <section className="border-t border-line">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 sm:grid-cols-3">
            <About title="What this is">
              Every aircraft on India&rsquo;s scheduled and non-scheduled operator permits, in one searchable list, with a page per tail and per operator.
            </About>
            <About title="Where it comes from">
              Two PDFs DGCA publishes each month. They are parsed, checked against DGCA&rsquo;s own counts, and versioned. Method and downloads on the{" "}
              <Link href="/data" className="text-fg underline decoration-line-2 underline-offset-4">data page</Link>.
            </About>
            <About title="What it is not">
              The civil aircraft register. Private aircraft, flying schools and state fleets have no public list, so they are not here. Roughly 1,300 of about 2,300 manned aircraft.
            </About>
          </div>
        </Container>
      </section>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="py-7 sm:px-8 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-[14px] font-medium text-fg-3">{label}</dt>
      <dd className="display mt-2 text-[40px] sm:text-[44px]">{fmtInt(value)}</dd>
      <dd className="mt-1 text-[14px] text-fg-2">{hint}</dd>
    </div>
  );
}

function About({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="h3">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{children}</p>
    </div>
  );
}
