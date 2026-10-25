import Link from "next/link";
import type { ArchivedAircraft, Stint } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { getEnrichment, getOperator, getPastOperator } from "@/lib/data";
import { ownerName, typeSlugOf } from "@/lib/registry";
import { Field } from "@/components/ui/Field";
import { OwnerLink } from "@/components/aircraft/Placard";

const LINK = "underline decoration-line-2 underline-offset-4 hover:decoration-fg";

const STATUS_BADGE: Record<ArchivedAircraft["status"], string> = {
  deregistered: "Deregistered",
  "off-permit": "Off permit",
  "register-only": "No operator permit",
  training: "Flying school",
};

const article = (word: string) => (/^[AEIOU]/i.test(word) && !/^(EU|ONE|UNI)/i.test(word) ? "an" : "a");

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Title fragments and one plain sentence describing an archived registration. */
export function archivedSummary(h: ArchivedAircraft) {
  const type = h.type.name;
  const operators = [...new Set(h.stints.map((s) => s.operator))];
  const last = operators.at(-1);
  const headline = h.training ? `${type}, ${h.training.fto}` : last ? `ex-${last} ${type}` : `${type}, Indian register`;
  const parts = [`is ${article(type)} ${type}${h.msn ? ` (serial ${h.msn})` : ""}`];
  if (operators.length) parts.push(`that was on the permit${operators.length > 1 ? "s" : ""} of ${joinNames(operators)}`);
  if (h.registeredOn) parts.push(`${operators.length ? "and was " : "that was "}registered in India on ${fmtDate(h.registeredOn)}`);
  let sentence = parts.join(" ");
  if (h.status === "deregistered" && h.deregisteredOn) sentence += `. DGCA deregistered it on ${fmtDate(h.deregisteredOn)}.`;
  else sentence += ".";
  if (h.training) sentence += ` DGCA's list of flying training organisations, as on ${fmtDate(h.training.asOn)}, shows it with ${h.training.fto.replace(/\.$/, "")}.`;
  return { headline, sentence, badge: STATUS_BADGE[h.status] };
}

function operatorHref(id: string): string | null {
  return getOperator(id) || getPastOperator(id) ? `/operators/${id}` : null;
}

function StintLine({ s }: { s: Stint }) {
  const href = operatorHref(s.operatorId);
  return (
    <li className="grid gap-1 py-3">
      <span className="text-[15px]">
        {href ? (
          <Link href={href} className={LINK}>
            {s.operator}
          </Link>
        ) : (
          s.operator
        )}
        <span className="ml-2 text-[13px] text-fg-3">{s.list === "scheduled" ? "Scheduled" : "Non-scheduled"}</span>
      </span>
      <span className="num text-[14px] text-fg-2">
        Added between {fmtDate(s.start.from)} and {fmtDate(s.start.to)}
        {s.end ? <> · removed between {fmtDate(s.end.from)} and {fmtDate(s.end.to)}</> : null}
      </span>
    </li>
  );
}

/** Registry facts for a registration that is no longer on an operator permit. */
export function ArchivedPlacard({ a }: { a: ArchivedAircraft }) {
  const typeSlug = typeSlugOf(a.type.name);
  const engine = getEnrichment(a.reg)?.engine;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
        <Field label="Type">
          {typeSlug ? (
            <Link href={`/types/${typeSlug}`} className={LINK}>
              {a.type.name}
            </Link>
          ) : (
            a.type.name
          )}
          {a.type.icao && <span className="mono ml-2 text-[13px] text-fg-3">{a.type.icao}</span>}
        </Field>
        <Field label="Model as printed">{a.model ?? "—"}</Field>
        <Field label="Serial number">
          <span className="mono">{a.msn ?? "—"}</span>
        </Field>
        {engine && <Field label="Engines">{engine}</Field>}
        <Field label="Registered in India">{fmtDate(a.registeredOn)}</Field>
        <Field label="Deregistered">{a.status === "deregistered" ? fmtDate(a.deregisteredOn) : "Not recorded"}</Field>
        {a.training && (
          <Field label="Flying school" className="col-span-2">
            <Link href={`/flying-schools/${a.training.ftoId}`} className={LINK}>
              {a.training.fto}
            </Link>
            <span className="mt-0.5 block text-[13px] text-fg-3">DGCA FTO list as on {fmtDate(a.training.asOn)}</span>
          </Field>
        )}
        {a.owner && (
          <Field label="Last registered owner">
            <OwnerLink raw={a.owner} />
          </Field>
        )}
        {a.lessor && ownerName(a.lessor) && (
          <Field label="Lessor">
            <OwnerLink raw={a.lessor} />
          </Field>
        )}
      </dl>
      <div>
        <h2 className="text-[13px] font-medium text-fg-3">Operator permits</h2>
        {a.stints.length ? (
          <ul className="mt-1 divide-y divide-line">
            {[...a.stints].reverse().map((s) => (
              <StintLine key={`${s.operatorId}|${s.start.to}`} s={s} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-fg-2">
            Never seen on a scheduled or non-scheduled operator list.{" "}
            {a.training
              ? "It flies with a flying training organisation, which DGCA lists separately."
              : "Privately owned, flying school and state aircraft appear only in DGCA\u2019s registration reports."}
          </p>
        )}
      </div>
    </div>
  );
}
