import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAircraft, getAircraftByReg, getChanges, getOperator } from "@/lib/data";
import { fmtDate, daysUntil } from "@/lib/format";
import { AircraftPhoto } from "@/components/AircraftPhoto";
import { ImageCredit } from "@/components/ImageCredit";
import { Barcode } from "@/components/Barcode";
import { Tag } from "@/components/Tag";

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

function Field({ label, children, mono = true }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="border-t border-line py-3">
      <div className="label mb-1 text-[10px]">{label}</div>
      <div className={`${mono ? "mono" : ""} text-sm text-fg`}>{children}</div>
    </div>
  );
}

export default async function AircraftPage({ params }: PageProps<"/aircraft/[reg]">) {
  const { reg } = await params;
  const a = getAircraftByReg(reg);
  if (!a) notFound();
  const op = getOperator(a.operatorId);
  const siblings = getAircraft().filter((x) => x.operatorId === a.operatorId && x.type.name === a.type.name && x.reg !== a.reg);
  const changes = getChanges();
  const added = changes?.added.find((c) => c.reg === a.reg);
  const moved = changes?.moved.find((c) => c.reg === a.reg);
  const validDays = daysUntil(a.permit.validUntil);

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="label mb-4 flex flex-wrap items-center gap-2">
        <Link href="/fleet" className="hover:text-fg">Fleet</Link>
        <span className="text-fg-dim">/</span>
        <Link href={`/operators/${a.operatorId}`} className="hover:text-fg">{a.operator}</Link>
        <span className="text-fg-dim">/</span>
        <span className="text-fg">{a.reg}</span>
      </div>

      {/* Boarding-pass style card */}
      <article className="frame frame-accent hairline grid overflow-hidden bg-bg-elev lg:grid-cols-[1.35fr_1fr]">
        <div className="relative border-b border-line lg:border-b-0 lg:border-r">
          <div className="aspect-[16/10] w-full">
            <AircraftPhoto image={a.image} wing={a.wing} alt={`${a.reg} ${a.type.name}`} width={1280} eager className="h-full w-full" />
          </div>
          <div className="absolute left-4 top-4 flex gap-2">
            <Tag tone={a.category === "scheduled" ? "accent" : "teal"}>{a.category === "scheduled" ? "Scheduled" : "Non-scheduled"}</Tag>
            <Tag>{a.wing === "FW" ? "Fixed wing" : a.wing === "RW" ? "Rotary" : "Balloon"}</Tag>
            {a.image && a.image.tier !== "exact" && <Tag tone="dim">representative photo</Tag>}
          </div>
          {a.image && <ImageCredit image={a.image} className="px-4 py-3" />}
        </div>

        <div className="dotgrid flex flex-col p-5 sm:p-7">
          <div className="label mb-2 flex items-center justify-between">
            <span>Registration</span>
            <span className="text-fg-dim">{a.hex ? `HEX ${a.hex}` : "HEX unknown"}</span>
          </div>
          <h1 className="display text-[clamp(56px,9vw,104px)] leading-none">{a.reg}</h1>
          <div className="mt-3 text-xl text-fg-muted">{a.type.name}</div>
          <div className="mono mt-1 text-sm text-fg-dim">{a.model}{a.type.icao ? ` · ICAO ${a.type.icao}` : ""}</div>

          <div className="mt-6 grid grid-cols-2 gap-x-6">
            <Field label="Operator" mono={false}>
              <Link href={`/operators/${a.operatorId}`} className="text-fg hover:text-accent">{a.operator}</Link>
              <div className="text-xs text-fg-dim">{a.operatorLegal}</div>
            </Field>
            <Field label="Seats">{a.seatsRaw ?? "—"}<span className="text-fg-dim"> · {a.role}</span></Field>
            <Field label={a.category === "scheduled" ? "AOC" : "AOP"}>
              {a.permit.no ?? "—"}
            </Field>
            <Field label="Permit valid until">
              {fmtDate(a.permit.validUntil)}
              {validDays != null && <span className={`ml-2 ${validDays < 180 ? "text-red" : "text-fg-dim"}`}>{validDays > 0 ? `+${validDays}d` : `${validDays}d`}</span>}
            </Field>
            <Field label="Manufacturer">{a.type.manufacturer}<span className="text-fg-dim"> · {a.type.family}</span></Field>
            <Field label="On DGCA list since">{fmtDate(a.firstSeen)}{added && <span className="ml-2 text-accent">new</span>}{moved && <span className="ml-2 text-teal">moved from {moved.from}</span>}</Field>
          </div>

          <div className="mt-auto pt-6">
            <div className="label mb-2 text-[10px]">Source</div>
            <div className="mono text-xs text-fg-muted">
              DGCA {a.source.file} · page {a.source.page} · updated as on {fmtDate(a.source.asOn)}
            </div>
            <Barcode seed={a.reg} className="mt-4 h-9 w-full text-fg" />
            <div className="mono mt-1 flex justify-between text-[10px] text-fg-dim">
              <span>{a.reg}</span><span>{a.hex ?? ""}</span><span>{a.type.icao ?? ""}</span><span>{a.source.asOn.replace(/-/g, "")}</span>
            </div>
          </div>
        </div>
      </article>

      {/* Siblings */}
      {siblings.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="label">Same type at {op?.name ?? a.operator} · {siblings.length}</h2>
            <Link href={`/fleet?o=${a.operatorId}&t=${encodeURIComponent(a.type.name)}`} className="label hover:text-fg">open in explorer →</Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((s) => (
              <Link key={s.reg} href={`/aircraft/${s.reg}`} className={`mono border px-2 py-1 text-xs hover:border-accent hover:text-accent ${s.image?.tier === "exact" ? "border-line-strong text-fg" : "border-line text-fg-muted"}`}>
                {s.reg}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
