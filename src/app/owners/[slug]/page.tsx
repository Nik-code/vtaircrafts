import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Aircraft } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { builtYear, getOwner, getOwnerPages } from "@/lib/registry";
import { Container, SectionHeader } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { JsonLd, breadcrumbs } from "@/components/JsonLd";

export function generateStaticParams() {
  return getOwnerPages().map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/owners/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const o = getOwner(slug);
  if (!o) return { title: slug };
  const n = o.owned.length + o.leased.length;
  return {
    title: `${o.name}: ${n} aircraft in India`,
    description: `Aircraft on Indian operator permits registered to or leased by ${o.name}, with operators ${o.operators
      .slice(0, 3)
      .map((x) => x.name)
      .join(", ")}. From DGCA registration reports.`,
    alternates: { canonical: `/owners/${o.slug}` },
  };
}

function Table({ rows }: { rows: Aircraft[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line text-[13px] text-fg-3">
            <th className="py-2 pr-4 font-medium">Registration</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Operator</th>
            <th className="py-2 text-right font-medium">Built</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((a) => (
            <tr key={a.reg}>
              <td className="py-2.5 pr-4">
                <Link href={`/aircraft/${a.reg}`} className="mono font-medium text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                  {a.reg}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-fg-2">{a.type.name}</td>
              <td className="py-2.5 pr-4">
                <Link href={`/operators/${a.operatorId}`} className="text-fg-2 hover:text-fg">
                  {a.operator}
                </Link>
              </td>
              <td className="num py-2.5 text-right text-fg-2">{builtYear(a)?.year ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function OwnerPage({ params }: PageProps<"/owners/[slug]">) {
  const { slug } = await params;
  const o = getOwner(slug);
  if (!o || o.owned.length + o.leased.length === 0) notFound();
  const types = new Map<string, number>();
  for (const a of [...o.owned, ...o.leased]) types.set(a.type.name, (types.get(a.type.name) ?? 0) + 1);

  return (
    <main className="py-10 sm:py-14">
      <JsonLd
        data={breadcrumbs([
          ["Owners", "/owners"],
          [o.name, `/owners/${o.slug}`],
        ])}
      />
      <Container>
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-fg-3" aria-label="Breadcrumb">
          <Link href="/owners" className="hover:text-fg">Owners</Link>
        </nav>
        <header>
          <h1 className="h1">{o.name}</h1>
          {o.trustee && (
            <p className="lede mt-4 max-w-[64ch]">A trustee: it holds registered title on behalf of an owner or investor that DGCA&rsquo;s reports do not name.</p>
          )}
        </header>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Field label="Registered owner of">
            <span className="display text-[40px]">{fmtInt(o.owned.length)}</span>
          </Field>
          <Field label="Lessor of">
            <span className="display text-[40px]">{fmtInt(o.leased.length)}</span>
          </Field>
          <Field label="Operators">
            <span className="display text-[40px]">{fmtInt(o.operators.length)}</span>
          </Field>
          <Field label="Types">
            <span className="display text-[40px]">{fmtInt(types.size)}</span>
          </Field>
        </dl>

        <section className="mt-16">
          <SectionHeader title="Operators" />
          <ul className="divide-y divide-line">
            {o.operators.map((x) => (
              <li key={x.id} className="flex items-baseline justify-between gap-4 py-3">
                <Link href={`/operators/${x.id}`} className="text-[15px] underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                  {x.name}
                </Link>
                <span className="num text-[15px] font-medium">{fmtInt(x.count)}</span>
              </li>
            ))}
          </ul>
        </section>

        {o.owned.length > 0 && (
          <section className="mt-16">
            <SectionHeader title="Registered owner" meta={`${fmtInt(o.owned.length)} aircraft`} />
            <Table rows={o.owned} />
          </section>
        )}
        {o.leased.length > 0 && (
          <section className="mt-16">
            <SectionHeader title="Lessor" meta={`${fmtInt(o.leased.length)} aircraft`} />
            <Table rows={o.leased} />
          </section>
        )}
        {o.archived.length > 0 && (
          <section className="mt-16">
            <SectionHeader title="Earlier aircraft" meta={`${fmtInt(o.archived.length)} no longer on a permit`} />
            <ul className="flex flex-wrap gap-2">
              {o.archived.map((h) => (
                <li key={h.reg}>
                  <Link href={`/aircraft/${h.reg}`} className="chip mono">
                    {h.reg}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {o.spvs.length > 1 && (
          <section className="mt-16">
            <SectionHeader title="Names as printed by DGCA" meta={`${fmtInt(o.spvs.length)}`} />
            <ul className="columns-1 gap-8 text-[14px] text-fg-2 sm:columns-2">
              {o.spvs.map((n) => (
                <li key={n} className="mb-1.5 break-inside-avoid">{n}</li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </main>
  );
}
