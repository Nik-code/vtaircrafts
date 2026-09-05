// Wikimedia Commons category for each aircraft type we know about, used by the
// "type-world" tier: a photograph of the same type anywhere in the world when no
// Indian tail of that type is photographed.
//
// Every entry was verified against the live API (action=query&prop=categoryinfo)
// while curating; the resolver in pipeline/images.ts re-verifies and falls back to
// list=search for anything missing or renamed, so a stale entry degrades to a
// search instead of breaking.
//
// - `prefer` gives +15 to files whose title/description/categories mention the exact
//   variant. Used where the category is a family (Learjet, Cessna Citation family).
// - `deny` hard-rejects files that clearly show a different type inside a family
//   category (e.g. a military derivative parked in a civil category).
//
// Keys are type names; both current and older spellings are listed, because
// classifyModel() in normalize.ts is still being tuned and an unmatched name only
// costs a search.

export interface TypeCategory {
  /** Commons category title, including the "Category:" prefix. */
  category: string;
  /** Bonus for files that mention the exact variant (family categories). */
  prefer?: RegExp;
  /** Hard reject: the file shows a different type. */
  deny?: RegExp;
}

/** Keyed by `type.name` as produced by classifyModel() in pipeline/lib/normalize.ts. */
export const TYPE_CATEGORIES: Record<string, TypeCategory> = {
  // --- Airliners -----------------------------------------------------------
  "Airbus A319": { category: "Category:Airbus A319" },
  "Airbus A320": { category: "Category:Airbus A320", deny: /\bneo\b|A320-2[57]1N/i },
  "Airbus A320neo": { category: "Category:Airbus A320neo" },
  "Airbus A321": { category: "Category:Airbus A321", deny: /\bneo\b|A321-2[57]1N/i },
  "Airbus A321neo": { category: "Category:Airbus A321neo" },
  "Airbus A350-900": { category: "Category:Airbus A350-900", deny: /A350-1000|A350-941F|freighter/i },
  "ATR 42-600": { category: "Category:ATR 42-600" },
  "ATR 72-600": { category: "Category:ATR 72-600" },
  "Boeing 737": { category: "Category:Boeing 737", prefer: /737-[78]00|737-8\b/i },
  "Boeing 737-700": { category: "Category:Boeing 737-700" },
  "Boeing 737-800": { category: "Category:Boeing 737-800" },
  "Boeing 737-8": { category: "Category:Boeing 737-8 MAX" },
  "Boeing 737-8-200": { category: "Category:Boeing 737-8 MAX", prefer: /8-?200|MAX ?8-?200/i },
  "Boeing 737-9": { category: "Category:Boeing 737-9 MAX" },
  "Boeing 757": { category: "Category:Boeing 757" },
  "Boeing 777-200LR": { category: "Category:Boeing 777-200LR" },
  "Boeing 777-300ER": { category: "Category:Boeing 777-300ER" },
  "Boeing 787-8": { category: "Category:Boeing 787-8" },
  "Boeing 787-9": { category: "Category:Boeing 787-9" },
  "Dash 8 Q400": { category: "Category:De Havilland Canada DHC-8-400" },
  "DHC-6 Twin Otter": { category: "Category:De Havilland Canada DHC-6 Twin Otter" },
  "Dornier 228": { category: "Category:Dornier 228" },
  "DO 228-201 (UPGRADED)": { category: "Category:Dornier 228" },
  "Embraer E170": { category: "Category:Embraer 170" },
  "EMBRAER ERJ 170-200 LR": { category: "Category:Embraer 175" },
  "Embraer ERJ 145": { category: "Category:Embraer ERJ 145" },
  "EMBRAER 135ER": { category: "Category:Embraer ERJ 135" },
  "Embraer ERJ 135": { category: "Category:Embraer ERJ 135" },
  "Embraer ERJ 135 / Legacy": { category: "Category:Embraer ERJ 135" },
  "EMBRAER 190-100ECJ (Lineage 1000)": { category: "Category:Embraer Lineage 1000" },
  "Mil Mi-172": { category: "Category:Mil Mi-17", prefer: /Mi-172/i },

  // --- Business jets -------------------------------------------------------
  "Beechcraft Premier I": { category: "Category:Beechcraft Premier" },
  "Bombardier Challenger": { category: "Category:Bombardier Challenger 604" },
  "Bombardier Challenger 300/350": { category: "Category:Bombardier Challenger 300", prefer: /Challenger 3[05]0/i },
  "Bombardier Challenger 600 series": { category: "Category:Bombardier Challenger 600", prefer: /Challenger 60[0-5]|CL-?60[0-5]/i },
  "Bombardier Global 5000/5500/6000/6500": { category: "Category:Bombardier Global 5000", prefer: /Global [56][0-9]00/i },
  "Bombardier Global 7500": { category: "Category:Bombardier Global 7500" },
  "Bombardier Global Express": { category: "Category:Bombardier Global Express" },
  "Cessna Citation": { category: "Category:Cessna Citation family", prefer: /Citation (II|III|550|551|650)/i },
  "Cessna Citation CJ series": { category: "Category:Cessna 525 CitationJet", prefer: /CJ[1-4]|525A?\b/i },
  "Cessna Citation XLS": { category: "Category:Cessna Citation Excel", prefer: /XLS|560XL/i },
  "Dassault Falcon": { category: "Category:Dassault Falcon 6X" },
  "Dassault Falcon 900": { category: "Category:Dassault Falcon 900" },
  "Dassault Falcon 2000": { category: "Category:Dassault Falcon 2000" },
  "Dassault Falcon 7X": { category: "Category:Dassault Falcon 7X" },
  "Embraer Legacy 600/650": { category: "Category:Embraer Legacy 600", prefer: /Legacy 6[05]0/i },
  "EMBRAER 135BJ": { category: "Category:Embraer Legacy 600" },
  "Embraer Phenom 100": { category: "Category:Embraer Phenom 100" },
  "G-150": { category: "Category:Gulfstream G150" },
  "Gulfstream G150": { category: "Category:Gulfstream G150" },
  Gulfstream: { category: "Category:Gulfstream G150" }, // all three VT tails are G150s
  "Gulfstream G200": { category: "Category:Gulfstream G200" },
  "Gulfstream G550": { category: "Category:Gulfstream G550" },
  "Hawker 800/850/900": { category: "Category:Hawker 800" },
  "HAWKER HS 125 900XP": { category: "Category:Hawker 800", prefer: /900XP/i },
  "HAWKER BEECHCRAFT 900XP": { category: "Category:Hawker 800", prefer: /900XP/i },
  "HAWKER 400A XP": { category: "Category:Hawker 400XP" },
  "Hawker-4000": { category: "Category:Hawker 4000" },
  "Hawker 4000": { category: "Category:Hawker 4000" },
  Learjet: { category: "Category:Learjet", prefer: /Learjet ?(40|45|60)/i },
  "P-180 AVANTI II": { category: "Category:Piaggio P.180 Avanti" },
  "Piaggio P.180 Avanti": { category: "Category:Piaggio P.180 Avanti" },
  "Pilatus PC-24": { category: "Category:Pilatus PC-24" },

  // --- Turboprops and general aviation -------------------------------------
  "Beechcraft King Air": { category: "Category:Beechcraft B200 Super King Air" },
  "Beechcraft King Air 200": { category: "Category:Beechcraft B200 Super King Air" },
  "B 200 GT": { category: "Category:Beechcraft B200 Super King Air" },
  "Beechcraft King Air 350": { category: "Category:Beechcraft B300 King Air 350" },
  "BEECHCRAFT 300LW": { category: "Category:Beechcraft Super King Air", prefer: /King Air 300|B300|300LW/i },
  "Beechcraft King Air C90": { category: "Category:Beechcraft 90 King Air", prefer: /C90/i },
  "Cessna 172": { category: "Category:Cessna 172" },
  "CESSNA R172K": { category: "Category:Cessna R172K Hawk XP" },
  "Cessna 206": { category: "Category:Cessna 206" },
  "Cessna 206 Stationair": { category: "Category:Cessna 206" },
  "CESSNA T206H": { category: "Category:Cessna T206H Turbo Stationair" },
  "Cessna 208 Grand Caravan": { category: "Category:Cessna 208B Grand Caravan" },
  "Partenavia P.68": { category: "Category:Partenavia P.68" },
  "Pilatus PC-12": { category: "Category:Pilatus PC-12" },
  "Tecnam P2006T": { category: "Category:Tecnam P2006T" },
  "STEMME S6RT": { category: "Category:Stemme S6" },
  "Stemme S6": { category: "Category:Stemme S6" },
  "Hot air balloon": { category: "Category:Hot air balloons" },

  // --- Helicopters ---------------------------------------------------------
  "AGUSTA 109E": { category: "Category:AgustaWestland AW109" },
  "GRAND AGUSTA 109S": { category: "Category:AgustaWestland AW109S Grand" },
  "Leonardo AW109": { category: "Category:AgustaWestland AW109" },
  "Leonardo AW119 Koala": { category: "Category:AgustaWestland AW119" },
  "Leonardo AW139": { category: "Category:AgustaWestland AW139" },
  "AW 139": { category: "Category:AgustaWestland AW139" },
  "Leonardo AW169": { category: "Category:AgustaWestland AW169" },
  "Airbus Dauphin / H155": { category: "Category:Airbus Helicopters H155 Dauphin" },
  "Airbus Dauphin (AS365)": { category: "Category:Airbus Helicopters AS365 Dauphin" },
  "Airbus AS355 Ecureuil 2": { category: "Category:Airbus Helicopters AS355 Ecureuil 2" },
  "SA 365N": { category: "Category:Airbus Helicopters AS365 Dauphin" },
  "AS 365 N3": { category: "Category:Airbus Helicopters AS365 Dauphin" },
  "Airbus H125 (AS350)": { category: "Category:Airbus Helicopters H125 Écureuil" },
  "EUROCOPTER AS355N": { category: "Category:Aerospatiale AS355" },
  "Airbus H130": { category: "Category:Airbus Helicopters H130 Ecureuil" },
  "Airbus H135": { category: "Category:Airbus Helicopters H135", deny: /H135M|military/i },
  "EC 135 P2+": { category: "Category:Airbus Helicopters H135", deny: /H135M|military/i },
  "EC 135P3H": { category: "Category:Airbus Helicopters H135", deny: /H135M|military/i },
  "Airbus H145": { category: "Category:Airbus Helicopters H145", deny: /H145M|UH-72|military/i },
  "Airbus H160": { category: "Category:Airbus Helicopters H160", deny: /H160M|Guépard|Guepard/i },
  "Bell 206 JetRanger": { category: "Category:Bell 206" },
  "Bell 407": { category: "Category:Bell 407" },
  "Bell 412": { category: "Category:Bell 412", deny: /CH-146|Griffon|UH-1|Huey/i },
  "Bell 429": { category: "Category:Bell 429" },
  "Bell helicopter": { category: "Category:Bell 407" }, // VT tails are 407/427/429
  "HAL Dhruv": { category: "Category:HAL Dhruv" },
  "Robinson R44": { category: "Category:Robinson R44" },
  "Sikorsky S-76": { category: "Category:Sikorsky S-76" },
};

/**
 * Tokens a searched category title must contain for a type name we have no
 * curated entry for: the manufacturer word, or a model token (a word carrying a
 * digit, e.g. "A320", "PC-12", "737-800").
 */
export function searchTokens(typeName: string): string[] {
  const words = typeName.split(/[\s/(),]+/).filter(Boolean);
  const tokens = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && /^[A-Za-z]+$/.test(w)) tokens.add(w.toLowerCase());
    if (/\d/.test(w) && w.length >= 2) tokens.add(w.toLowerCase());
  }
  return [...tokens];
}
