// Plain-language answers for each registration: page titles, meta descriptions, the lede and the
// question list. Search engines and AI answers quote these, so every claim stays one DGCA fact.
import { getEnrichment, getMeta, getTypeSpec } from "./data";
import { fmtDate } from "./format";
import { builtYear, getType, ownerName, typeSlugOf } from "./registry";
import type { Aircraft, ArchivedAircraft } from "./types";

export interface Answer {
  q: string;
  a: string;
}

const article = (word: string) => (/^[AEIOU]/i.test(word) && !/^(EU|ONE|UNI)/i.test(word) ? "an" : "a");
const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

/** "Leonardo AW169 helicopter", but "Hot air balloon", not "Hot air balloon balloon". */
const typeWithNoun = (typeName: string, noun: string) => (typeName.toLowerCase().includes(noun.split(" ").at(-1)!) ? typeName : `${typeName} ${noun}`);

/** "VTDBJ" and "VT DBJ", the other ways people type a registration. */
export function regVariants(reg: string): string[] {
  return [reg.replace("-", ""), reg.replace("-", " ")];
}

/** What a searcher calls it: helicopter, business jet, balloon, or aircraft. */
export function nounFor(t: { wing: Aircraft["wing"]; icao: string | null; seats?: number | null; category?: Aircraft["category"] }): string {
  if (t.wing === "RW") return "helicopter";
  if (t.wing === "B") return "balloon";
  const kind = getTypeSpec(t.icao)?.engineKind;
  if (kind === "jet" && t.category === "non-scheduled" && t.seats != null && t.seats <= 19) return "business jet";
  return "aircraft";
}

function wingOf(typeName: string): Aircraft["wing"] {
  const slug = typeSlugOf(typeName);
  return (slug && getType(slug)?.wing) || "FW";
}

const permitLabel = (a: Aircraft) => `${a.category === "scheduled" ? "scheduled" : "non-scheduled"} operator permit${a.permit.no ? ` ${a.permit.no}` : ""}`;

// ---------------------------------------------------------------------------------------------
// On a permit today

function current(a: Aircraft) {
  const noun = nounFor({ wing: a.wing, icao: a.type.icao, seats: a.seats, category: a.category });
  const owner = ownerName(a.history?.owner)?.name ?? null;
  const lessor = ownerName(a.history?.lessor)?.name ?? null;
  const msn = a.history?.msn ?? getEnrichment(a.reg)?.msn ?? null;
  const built = builtYear(a)?.year ?? null;
  const asOn = fmtDate(a.source.asOn);
  const named = typeWithNoun(a.type.name, noun);
  const what = `${article(named)} ${named}`;

  const lede = [
    `${a.reg} is ${what}`,
    owner ? ` owned by ${owner} and operated by ${a.operator}` : ` operated by ${a.operator}`,
    ` under DGCA ${permitLabel(a)}.`,
  ].join("");
  const facts = [msn && `MSN ${msn}`, built && `built ${built}`, a.history?.registeredOn && `registered in India on ${fmtDate(a.history.registeredOn)}`].filter(Boolean);

  const answers: Answer[] = [];
  if (owner) {
    answers.push({
      q: `Who owns ${a.reg}?`,
      a: `DGCA lists ${owner} as the registered owner of ${a.reg}.${lessor && lessor !== owner ? ` The lessor is ${lessor}.` : ""} It is operated by ${a.operator}.`,
    });
  }
  answers.push({
    q: `Who operates ${a.reg}?`,
    a: `${a.operator} (${a.operatorLegal}) operates ${a.reg} under DGCA ${permitLabel(a)}${a.permit.validUntil ? `, valid until ${fmtDate(a.permit.validUntil)}` : ""}.`,
  });
  answers.push({
    q: `What type of ${noun} is ${a.reg}?`,
    a: [
      `${a.reg} is ${what}${a.type.manufacturer && !a.type.name.startsWith(a.type.manufacturer) ? ` made by ${a.type.manufacturer}` : ""}.`,
      msn && ` Its manufacturer serial number (MSN) is ${msn}.`,
      built && ` It was built in ${built}.`,
      a.seats && ` DGCA lists ${a.seats} seats.`,
    ]
      .filter(Boolean)
      .join(""),
  });
  if (a.history?.registeredOn) {
    answers.push({ q: `When was ${a.reg} registered in India?`, a: `${a.reg} was registered in India on ${fmtDate(a.history.registeredOn)}.` });
  }
  answers.push({
    q: `Is ${a.reg} still in service?`,
    a: `${a.reg} is on ${possessive(a.operator)} ${a.category} list in DGCA's latest operator lists, as on ${asOn}.`,
  });
  if (a.hex) {
    answers.push({
      q: `What is the Mode S hex code of ${a.reg}?`,
      a: `The Mode S (ICAO 24-bit) hex code of ${a.reg} is ${a.hex.toUpperCase()}. ADS-B flight trackers identify the ${noun} by this code.`,
    });
  }

  return {
    title: `${a.reg}: ${named}, owner and operator`,
    description: `${lede}${facts.length ? ` ${capitalise(facts.join(", "))}.` : ""}`,
    lede,
    answers,
  };
}

// ---------------------------------------------------------------------------------------------
// Off permit: deregistered, flying school or register-only

function archived(h: ArchivedAircraft, sentence: string) {
  const noun = nounFor({ wing: wingOf(h.type.name), icao: h.type.icao });
  const named = typeWithNoun(h.type.name, noun);
  const owner = ownerName(h.owner)?.name ?? null;
  const operators = [...new Set(h.stints.map((s) => s.operator))];
  const asOn = fmtDate(getMeta().snapshot);

  const answers: Answer[] = [];
  if (owner) {
    answers.push({
      q: `Who owns ${h.reg}?`,
      a: `The last registered owner DGCA recorded for ${h.reg} is ${owner}.${h.status === "deregistered" ? " The registration has since been cancelled." : ""}`,
    });
  }
  if (operators.length) {
    answers.push({ q: `Which operators flew ${h.reg}?`, a: `${h.reg} was on the DGCA operator permit${operators.length > 1 ? "s" : ""} of ${joinNames(operators)}.` });
  }
  answers.push({
    q: `What type of ${noun} is ${h.reg}?`,
    a: `${h.reg} is ${article(named)} ${named}${h.msn ? `, manufacturer serial number (MSN) ${h.msn}` : ""}.`,
  });
  if (h.registeredOn) answers.push({ q: `When was ${h.reg} registered in India?`, a: `${h.reg} was registered in India on ${fmtDate(h.registeredOn)}.` });
  answers.push({
    q: `Is ${h.reg} still in service?`,
    a:
      h.status === "deregistered"
        ? `No. DGCA deregistered ${h.reg}${h.deregisteredOn ? ` on ${fmtDate(h.deregisteredOn)}` : ""}.`
        : h.training
          ? `${h.reg} is not on an airline or charter permit. DGCA's flying training list, as on ${fmtDate(h.training.asOn)}, shows it with ${h.training.fto.replace(/\.$/, "")}.`
          : `${h.reg} is not on any scheduled or non-scheduled operator permit in DGCA's latest lists, as on ${asOn}.`,
  });

  const title = h.training
    ? `${h.reg}: ${h.type.name} trainer, ${h.training.fto.replace(/\.$/, "")}`
    : operators.length
      ? `${h.reg}: ex-${operators.at(-1)} ${h.type.name}, owner and history`
      : `${h.reg}: ${named}, ${owner ? "owner and history" : "history"}`;
  return {
    title,
    description: `${h.reg} ${sentence}${owner ? ` Last registered owner: ${owner}.` : ""}`,
    lede: `${h.reg} ${sentence}`,
    answers,
  };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function answersFor(a: Aircraft) {
  return current(a);
}

export function archivedAnswersFor(h: ArchivedAircraft, summary: { sentence: string }) {
  return archived(h, summary.sentence);
}

/** schema.org FAQPage for a question list. */
export function faqJsonLd(answers: Answer[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: answers.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}
