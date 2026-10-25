import type { Metadata } from "next";
import Link from "next/link";
import { getAircraftByReg, getArchivedByReg, getPastOperator } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Bar } from "@/components/ui/Bar";
import { Container, SectionHeader } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

interface Tail {
  reg: string;
  type: string;
  now: { id: string; name: string } | null;
}

function tailsOf(regs: string[]): Tail[] {
  return regs.map((reg) => {
    const cur = getAircraftByReg(reg);
    if (cur) return { reg, type: cur.type.name, now: { id: cur.operatorId, name: cur.operator } };
    return { reg, type: getArchivedByReg(reg)?.type.name ?? "Unknown type", now: null };
  });
}

const year = (iso: string) => iso.slice(0, 4);

export function pastOperatorMeta(id: string): Metadata {
  const o = getPastOperator(id);
  if (!o) return { title: id };
  return {
    title: `${o.name} fleet history: ${o.regs.length} aircraft, ${year(o.firstSeen)} to ${year(o.lastSeen)}`,
    description: `Every aircraft DGCA listed under ${o.name} between ${fmtDate(o.firstSeen)} and ${fmtDate(o.lastSeen)}, with types, registration dates, owners and where each tail went.`,
    alternates: { canonical: `/operators/${o.id}` },
  };
}

/** An operator that held a permit in an earlier DGCA list but holds none today. */
export function PastOperatorPage({ id }: { id: string }) {
  const o = getPastOperator(id)!;
  const tails = tailsOf(o.regs);
  const byType = new Map<string, Tail[]>();
  for (const t of tails) byType.set(t.type, [...(byType.get(t.type) ?? []), t]);
  const types = [...byType.entries()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));
  const maxType = types[0]?.[1].length ?? 1;
  const elsewhere = tails.filter((t) => t.now).length;
  const scheduled = o.lists.includes("scheduled");

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={breadcrumbs([
          ["Operators", "/operators"],
          [o.name, `/operators/${o.id}`],
        ])}
      />
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/operators" className="hover:text-fg">Operators</Link>
          <span aria-hidden>/</span>
          <span>Past operators</span>
        </nav>

        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="h1">{o.name}</h1>
            <Badge className="mt-1">No current permit</Badge>
          </div>
          <p className="lede mt-4 max-w-[64ch]">
            On DGCA&rsquo;s {o.lists.length === 2 ? "scheduled and non-scheduled" : scheduled ? "scheduled" : "non-scheduled"} operator lists from at
            least {fmtDate(o.firstSeen)} until {fmtDate(o.lastSeen)}. These are the aircraft listed under it in that time.
          </p>
        </header>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Field label="Aircraft listed">
            <span className="display text-[40px]">{fmtInt(o.regs.length)}</span>
          </Field>
          <Field label="Types">
            <span className="display text-[40px]">{fmtInt(types.length)}</span>
          </Field>
          <Field label="First seen">{fmtDate(o.firstSeen)}</Field>
          <Field label="Last seen">{fmtDate(o.lastSeen)}</Field>
        </dl>
        {elsewhere > 0 && (
          <p className="mt-6 text-[15px] text-fg-2">
            {fmtInt(elsewhere)} of these aircraft {elsewhere === 1 ? "is" : "are"} on another operator&rsquo;s permit today.
          </p>
        )}

        <section className="mt-16">
          <SectionHeader title="Type mix" />
          <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {types.map(([name, list]) => (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px]">{name}</span>
                  <span className="num text-[15px] font-medium">{fmtInt(list.length)}</span>
                </div>
                <Bar ratio={list.length / maxType} tone={scheduled ? "fg" : "teal"} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <SectionHeader title="Aircraft" meta={`${fmtInt(o.regs.length)} registrations`} />
          <div className="space-y-8">
            {types.map(([name, list]) => (
              <div key={name}>
                <h3 className="mb-3 flex items-baseline gap-2 text-[15px] font-medium">
                  {name}
                  <span className="num text-fg-3">{fmtInt(list.length)}</span>
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {list.map((t) => (
                    <li key={t.reg}>
                      <Link href={`/aircraft/${t.reg}`} className="chip mono" title={t.now ? `Now with ${t.now.name}` : undefined}>
                        {t.reg}
                        {t.now && <span className="text-fg-3">now {t.now.name}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
