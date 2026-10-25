import type { Metadata } from "next";
import Link from "next/link";
import { getAircraft, getMeta, getOperators } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { ageOf, ageSummary, builtYear, getLessorLeague, getTypes, registerByYear } from "@/lib/registry";
import { Bar } from "@/components/ui/Bar";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Indian commercial fleet statistics",
  description:
    "India's commercial aircraft fleet in numbers: average fleet age by airline, aircraft registered and deregistered each year since 2010, the oldest aircraft still on a permit, top types and lessors.",
  alternates: { canonical: "/stats" },
};

const LINK = "underline decoration-line-2 underline-offset-4 hover:decoration-fg";

function YearChart({ rows }: { rows: Array<{ year: number; registered: number; deregistered: number }> }) {
  const max = Math.max(...rows.flatMap((r) => [r.registered, r.deregistered]), 1);
  return (
    <figure>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-fg-2" aria-hidden>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-in" /> Registered
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-out" /> Deregistered
        </span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-line" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-line" aria-hidden />
        <span className="num absolute -top-2.5 right-0 bg-bg pl-1 text-[12px] text-fg-3" aria-hidden>{fmtInt(max)}</span>
        <ol className="relative flex h-48 items-end gap-1 border-b border-line-2 sm:gap-2" aria-hidden>
          {rows.map((r) => (
            <li key={r.year} className="group relative flex h-full flex-1 items-end justify-center gap-[2px]">
              <span className="w-full max-w-[14px] rounded-t-[4px] bg-chart-in" style={{ height: `${(r.registered / max) * 100}%` }} />
              <span className="w-full max-w-[14px] rounded-t-[4px] bg-chart-out" style={{ height: `${(r.deregistered / max) * 100}%` }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line-2 bg-bg-2 px-3 py-2 text-[13px] text-fg shadow-sm group-hover:block">
                <span className="num block font-medium">{r.year}</span>
                <span className="num block text-fg-2">{fmtInt(r.registered)} registered</span>
                <span className="num block text-fg-2">{fmtInt(r.deregistered)} deregistered</span>
              </span>
            </li>
          ))}
        </ol>
        <ol className="mt-2 flex gap-1 sm:gap-2" aria-hidden>
          {rows.map((r, i) => (
            <li key={r.year} className="num flex-1 text-center text-[11px] text-fg-3 sm:text-[12px]">
              {i % 2 === 0 || rows.length <= 10 ? `’${String(r.year).slice(2)}` : ""}
            </li>
          ))}
        </ol>
      </div>
      <details className="mt-5 text-[14px]">
        <summary className="cursor-pointer text-fg-2 hover:text-fg">Show as a table</summary>
        <table className="mt-3 w-full max-w-[420px] text-left">
          <thead>
            <tr className="border-b border-line text-[13px] text-fg-3">
              <th className="py-1.5 font-medium">Year</th>
              <th className="py-1.5 text-right font-medium">Registered</th>
              <th className="py-1.5 text-right font-medium">Deregistered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.year}>
                <td className="num py-1.5">{r.year}</td>
                <td className="num py-1.5 text-right">{fmtInt(r.registered)}</td>
                <td className="num py-1.5 text-right">{fmtInt(r.deregistered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export default function StatsPage() {
  const meta = getMeta();
  const aircraft = getAircraft();
  const operators = getOperators();
  const overall = ageSummary(aircraft);
  const seats = aircraft.reduce((n, a) => n + (a.seats ?? 0), 0);

  const byOperator = operators
    .filter((o) => o.category === "scheduled" || o.fleetCount >= 10)
    .map((o) => ({ o, age: ageSummary(aircraft.filter((a) => a.operatorId === o.id)) }))
    .filter((r) => r.age.mean != null && r.age.known >= 3)
    .sort((x, y) => y.o.fleetCount - x.o.fleetCount || x.o.name.localeCompare(y.o.name));
  const maxAge = Math.max(...byOperator.map((r) => r.age.mean ?? 0), 1);

  const years = registerByYear().filter((r) => r.year >= 2010);
  const oldest = aircraft
    .filter((a) => builtYear(a))
    .sort((x, y) => builtYear(x)!.year - builtYear(y)!.year || x.reg.localeCompare(y.reg))
    .slice(0, 12);
  const types = getTypes().slice(0, 10);
  const maxType = types[0]?.aircraft.length ?? 1;
  const lessors = getLessorLeague().slice(0, 10);

  return (
    <main className="py-10 sm:py-14">
      <JsonLd data={breadcrumbs([["Stats", "/stats"]])} />
      <Container>
        <PageHeader
          eyebrow={`As on ${fmtDate(meta.snapshot)}`}
          title="The fleet in numbers"
          lede="India's scheduled and non-scheduled fleet, from DGCA's operator lists and registration reports. Ages count only aircraft with a known build year, and every figure says how many that is."
        />

        <dl className="mt-12 grid grid-cols-2 border-y border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
          {[
            ["Aircraft", fmtInt(aircraft.length), `${fmtInt(operators.length)} operators`],
            ["Types", fmtInt(getTypes().length), `${fmtInt(meta.counts.rotary)} helicopters`],
            ["Seats", fmtInt(seats), "as printed on the lists"],
            ["Average age", overall.mean != null ? `${overall.mean.toFixed(1)} yrs` : "—", `${fmtInt(overall.known)} of ${fmtInt(overall.total)} known`],
          ].map(([label, value, hint]) => (
            <div key={label} className="px-1 py-6 sm:px-6">
              <dt className="text-[13px] font-medium text-fg-3">{label}</dt>
              <dd className="display mt-1 text-[clamp(32px,5vw,44px)]">{value}</dd>
              <dd className="mt-1 text-[13px] text-fg-3">{hint}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-16">
          <SectionHeader title="Average fleet age" meta="by operator, largest fleets first" />
          <ul className="space-y-5">
            {byOperator.map(({ o, age }) => (
              <li key={o.id} className="grid gap-x-6 gap-y-1 sm:grid-cols-[14rem_1fr_9rem] sm:items-center">
                <Link href={`/operators/${o.id}`} className={`text-[15px] ${LINK}`}>
                  {o.name}
                </Link>
                <Bar ratio={(age.mean ?? 0) / maxAge} tone={o.category === "scheduled" ? "fg" : "teal"} />
                <span className="num text-[14px] text-fg-2 sm:text-right">
                  <span className="font-medium text-fg">{age.mean!.toFixed(1)} yrs</span> · {fmtInt(age.known)} of {fmtInt(age.total)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-fg-3">
            Scheduled airlines, plus non-scheduled operators with ten or more aircraft. Build year is DGCA&rsquo;s year of manufacture, or VRS
            standing-data where DGCA has none. Age is counted to {meta.snapshot.slice(0, 4)}.
          </p>
        </section>

        <section className="mt-16">
          <SectionHeader title="Registered and deregistered" meta={`per year, ${years[0]?.year} to ${years.at(-1)?.year}`} />
          <YearChart rows={years} />
          <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-fg-3">
            Every civil registration in DGCA&rsquo;s reports, including private, flying school and state aircraft. DGCA&rsquo;s reports for
            July to December 2021 are scanned images and are not counted, so 2021 is low. {years.at(-1)?.year} is the year to date.
          </p>
        </section>

        <section className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeader title="Most common types" />
            <ul className="space-y-4">
              {types.map((t) => (
                <li key={t.slug}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/types/${t.slug}`} className={`text-[15px] ${LINK}`}>
                      {t.name}
                    </Link>
                    <span className="num text-[15px] font-medium">{fmtInt(t.aircraft.length)}</span>
                  </div>
                  <Bar ratio={t.aircraft.length / maxType} className="mt-2" />
                </li>
              ))}
            </ul>
            <Link href="/types" className={`mt-5 inline-block text-[15px] text-fg-2 ${LINK}`}>
              All types
            </Link>
          </div>
          <div>
            <SectionHeader title="Largest owners and lessors" />
            <ul className="divide-y divide-line">
              {lessors.map((o) => (
                <li key={o.slug} className="flex items-baseline justify-between gap-4 py-2.5">
                  <Link href={`/owners/${o.slug}`} className={`text-[15px] ${LINK}`}>
                    {o.name}
                  </Link>
                  <span className="num text-[15px] font-medium">{fmtInt(o.owned.length + o.leased.length)}</span>
                </li>
              ))}
            </ul>
            <Link href="/owners" className={`mt-5 inline-block text-[15px] text-fg-2 ${LINK}`}>
              All owners and lessors
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader title="Oldest aircraft on a permit" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-fg-3">
                  <th className="py-2 pr-4 font-medium">Registration</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Operator</th>
                  <th className="py-2 pr-4 text-right font-medium">Built</th>
                  <th className="py-2 text-right font-medium">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {oldest.map((a) => (
                  <tr key={a.reg}>
                    <td className="py-2.5 pr-4">
                      <Link href={`/aircraft/${a.reg}`} className={`mono font-medium text-fg ${LINK}`}>
                        {a.reg}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-fg-2">{a.type.name}</td>
                    <td className="py-2.5 pr-4 text-fg-2">{a.operator}</td>
                    <td className="num py-2.5 pr-4 text-right">{builtYear(a)!.year}</td>
                    <td className="num py-2.5 text-right text-fg-2">{ageOf(a)} yrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </main>
  );
}
