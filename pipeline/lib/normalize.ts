import { slugify } from "./text";

/** Display names and brands for operators. Keys are matched case-insensitively against the legal name. */
const OPERATOR_ALIASES: Array<{ match: RegExp; id: string; name: string; legal?: string; website?: string }> = [
  { match: /^air india ltd/i, id: "air-india", name: "Air India", website: "https://www.airindia.com" },
  { match: /^air india express/i, id: "air-india-express", name: "Air India Express", website: "https://www.airindiaexpress.com" },
  { match: /^aix connect/i, id: "air-india-express", name: "Air India Express", website: "https://www.airindiaexpress.com" },
  { match: /^alliance air/i, id: "alliance-air", name: "Alliance Air", website: "https://www.allianceair.in" },
  { match: /^blue dart/i, id: "blue-dart-aviation", name: "Blue Dart Aviation", website: "https://www.bluedart.com" },
  { match: /^india one air/i, id: "indiaone-air", name: "IndiaOne Air", website: "https://www.indiaoneair.com" },
  { match: /^ghodawat/i, id: "star-air", name: "Star Air", website: "https://www.starair.in" },
  { match: /^interglobe/i, id: "indigo", name: "IndiGo", website: "https://www.goindigo.in" },
  { match: /^just udo/i, id: "fly91", name: "Fly91", website: "https://www.fly91.in" },
  { match: /^quikjet/i, id: "quikjet", name: "Quikjet Cargo", website: "https://www.quikjet.in" },
  { match: /^snv aviation/i, id: "akasa-air", name: "Akasa Air", website: "https://www.akasaair.com" },
  { match: /^spice ?jet/i, id: "spicejet", name: "SpiceJet", website: "https://www.spicejet.com" },
  { match: /^skyhop/i, id: "skyhop-aviation", name: "Skyhop Aviation" },
  { match: /^big charter/i, id: "flybig", name: "FlyBig", website: "https://www.flybig.in" },
  { match: /^tata sia/i, id: "vistara", name: "Vistara" },
  { match: /^zexus/i, id: "zexus-air", name: "Zexus Air" },
  { match: /^gsec monarch/i, id: "gsec-monarch-deccan", name: "GSEC Monarch & Deccan Charters" },
  { match: /^global vectra/i, id: "global-vectra-helicorp", name: "Global Vectra Helicorp" },
  { match: /^pawan hans/i, id: "pawan-hans", name: "Pawan Hans" },
  { match: /^club one air/i, id: "club-one-air", name: "Club One Air" },
  { match: /^jetsetgo/i, id: "jetsetgo", name: "JetSetGo" },
  { match: /^deccan charters/i, id: "deccan-charters", name: "Deccan Charters" },
  { match: /^heligo/i, id: "heligo-charters", name: "Heligo Charters" },
  { match: /^taj air/i, id: "taj-air", name: "Taj Air" },
  { match: /^reliance commercial dealers/i, id: "reliance-commercial-dealers", name: "Reliance Commercial Dealers" },
  { match: /^poonawalla/i, id: "poonawalla-aviation", name: "Poonawalla Aviation" },
  { match: /^airports authority of india/i, id: "aai-flight-inspection", name: "AAI Flight Inspection Unit" },
];

export interface OperatorIdentity {
  id: string;
  name: string;
  legalName: string;
  website: string | null;
}

export function identifyOperator(legalName: string, brandRaw: string | null): OperatorIdentity {
  const legal = legalName.replace(/\s+/g, " ").replace(/\s*\([^)]*\)\s*$/, "").trim();
  for (const a of OPERATOR_ALIASES) {
    if (a.match.test(legal)) return { id: a.id, name: a.name, legalName: legal, website: a.website ?? null };
  }
  const brand = brandRaw?.trim();
  const name = brand && brand.length > 2 ? titleCaseBrand(brand) : shortenLegal(legal);
  return { id: slugify(name), name, legalName: legal, website: null };
}

function titleCaseBrand(s: string) {
  if (s === s.toUpperCase()) return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
  return s;
}

function shortenLegal(s: string) {
  return s
    .replace(/\b(Private|Pvt\.?)\s+(Limited|Ltd\.?)\b/gi, "")
    .replace(/\b(Limited|Ltd\.?|LLP|Inc\.?)\b\.?/gi, "")
    .replace(/[.,]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface TypeInfo {
  icao: string | null;
  manufacturer: string;
  family: string;
  name: string;
}

interface Rule {
  re: RegExp;
  icao: string | null;
  manufacturer: string;
  family: string;
  name?: string;
}

const RULES: Rule[] = [
  // Airbus
  { re: /A319/i, icao: "A319", manufacturer: "Airbus", family: "A320 family", name: "Airbus A319" },
  { re: /A320-?2\d\dN|A320\s*NEO/i, icao: "A20N", manufacturer: "Airbus", family: "A320neo family", name: "Airbus A320neo" },
  { re: /A320/i, icao: "A320", manufacturer: "Airbus", family: "A320 family", name: "Airbus A320" },
  { re: /A321-?2\d\dNX?|A321\s*NEO/i, icao: "A21N", manufacturer: "Airbus", family: "A320neo family", name: "Airbus A321neo" },
  { re: /A321/i, icao: "A321", manufacturer: "Airbus", family: "A320 family", name: "Airbus A321" },
  { re: /A330-?2/i, icao: "A332", manufacturer: "Airbus", family: "A330", name: "Airbus A330-200" },
  { re: /A330-?3/i, icao: "A333", manufacturer: "Airbus", family: "A330", name: "Airbus A330-300" },
  { re: /A350-?9/i, icao: "A359", manufacturer: "Airbus", family: "A350", name: "Airbus A350-900" },
  { re: /A350-?10/i, icao: "A35K", manufacturer: "Airbus", family: "A350", name: "Airbus A350-1000" },
  // Boeing
  { re: /B?737-?7/i, icao: "B737", manufacturer: "Boeing", family: "737 Next Generation", name: "Boeing 737-700" },
  { re: /B?737-?8200|737-?8-?200|MAX\s*8-?200/i, icao: "B38M", manufacturer: "Boeing", family: "737 MAX", name: "Boeing 737-8-200" },
  { re: /B?737-?800/i, icao: "B738", manufacturer: "Boeing", family: "737 Next Generation", name: "Boeing 737-800" },
  { re: /B?737-?8\b|MAX\s*8/i, icao: "B38M", manufacturer: "Boeing", family: "737 MAX", name: "Boeing 737-8" },
  { re: /B?737-?9\b|MAX\s*9/i, icao: "B39M", manufacturer: "Boeing", family: "737 MAX", name: "Boeing 737-9" },
  { re: /B?737/i, icao: "B737", manufacturer: "Boeing", family: "737", name: "Boeing 737" },
  { re: /B?747-?4/i, icao: "B744", manufacturer: "Boeing", family: "747", name: "Boeing 747-400" },
  { re: /B?757/i, icao: "B752", manufacturer: "Boeing", family: "757", name: "Boeing 757" },
  { re: /B?767/i, icao: "B763", manufacturer: "Boeing", family: "767", name: "Boeing 767" },
  { re: /B?777-?2/i, icao: "B772", manufacturer: "Boeing", family: "777", name: "Boeing 777-200LR" },
  { re: /B?777-?3/i, icao: "B77W", manufacturer: "Boeing", family: "777", name: "Boeing 777-300ER" },
  { re: /B?787-?8/i, icao: "B788", manufacturer: "Boeing", family: "787 Dreamliner", name: "Boeing 787-8" },
  { re: /B?787-?9/i, icao: "B789", manufacturer: "Boeing", family: "787 Dreamliner", name: "Boeing 787-9" },
  { re: /BBJ/i, icao: "B737", manufacturer: "Boeing", family: "Boeing Business Jet", name: "Boeing Business Jet" },
  // Regional / turboprop
  { re: /ATR\s*-?\s*72/i, icao: "AT76", manufacturer: "ATR", family: "ATR 72", name: "ATR 72-600" },
  { re: /ATR\s*-?\s*42/i, icao: "AT46", manufacturer: "ATR", family: "ATR 42", name: "ATR 42-600" },
  { re: /Q400|DHC-?8-?4|Dash\s*8/i, icao: "DH8D", manufacturer: "De Havilland Canada", family: "Dash 8", name: "Dash 8 Q400" },
  { re: /DHC-?6|Twin Otter/i, icao: "DHC6", manufacturer: "De Havilland Canada", family: "DHC-6", name: "DHC-6 Twin Otter" },
  { re: /Dornier|DO[\s-]?228/i, icao: "D228", manufacturer: "Dornier / HAL", family: "Do 228", name: "Dornier 228" },
  { re: /EMB-?\s?170|E-?170|ERJ-?\s?170/i, icao: "E170", manufacturer: "Embraer", family: "E-Jet", name: "Embraer E170" },
  { re: /EMB-?175|E-?175/i, icao: "E75L", manufacturer: "Embraer", family: "E-Jet", name: "Embraer E175" },
  { re: /EMB-?190|E-?190/i, icao: "E190", manufacturer: "Embraer", family: "E-Jet", name: "Embraer E190" },
  { re: /EMB-?145|ERJ-?145/i, icao: "E145", manufacturer: "Embraer", family: "ERJ", name: "Embraer ERJ 145" },
  { re: /EMB-?\s?135\s*BJ|Legacy\s*6[05]0/i, icao: "E35L", manufacturer: "Embraer", family: "Legacy", name: "Embraer Legacy 600/650" },
  { re: /EMB-?\s?135|ERJ-?\s?135|Legacy/i, icao: "E135", manufacturer: "Embraer", family: "ERJ", name: "Embraer ERJ 135" },
  { re: /Legacy\s*500|EMB-?550/i, icao: "E550", manufacturer: "Embraer", family: "Legacy", name: "Embraer Legacy 500" },
  { re: /Praetor\s*600/i, icao: "E550", manufacturer: "Embraer", family: "Praetor", name: "Embraer Praetor 600" },
  { re: /Phenom\s*300|EMB-?505/i, icao: "E55P", manufacturer: "Embraer", family: "Phenom", name: "Embraer Phenom 300" },
  { re: /Phenom\s*100|EMB-?500/i, icao: "E50P", manufacturer: "Embraer", family: "Phenom", name: "Embraer Phenom 100" },
  { re: /Caravan|208B?/i, icao: "C208", manufacturer: "Cessna", family: "Caravan", name: "Cessna 208 Grand Caravan" },
  // Business jets
  { re: /Global\s*7500|BD-?700-?2A12/i, icao: "GL7T", manufacturer: "Bombardier", family: "Global", name: "Bombardier Global 7500" },
  { re: /Global\s*(5500|6500)|BD-?700-?1A1[01]/i, icao: "GL5T", manufacturer: "Bombardier", family: "Global", name: "Bombardier Global 5000/5500/6000/6500" },
  { re: /Global|BD-?700/i, icao: "GLEX", manufacturer: "Bombardier", family: "Global", name: "Bombardier Global Express" },
  { re: /Challenger\s*(60[45]|650)|CL-?600-?2B16/i, icao: "CL60", manufacturer: "Bombardier", family: "Challenger", name: "Bombardier Challenger 600 series" },
  { re: /Challenger\s*3[05]0|CL-?600-?2B19|BD-?100/i, icao: "CL30", manufacturer: "Bombardier", family: "Challenger", name: "Bombardier Challenger 300/350" },
  { re: /Challenger|CL-?600/i, icao: "CL60", manufacturer: "Bombardier", family: "Challenger", name: "Bombardier Challenger" },
  { re: /Learjet|LJ-?\d/i, icao: "LJ45", manufacturer: "Bombardier", family: "Learjet", name: "Learjet" },
  { re: /Falcon\s*2000/i, icao: "F2TH", manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 2000" },
  { re: /Falcon\s*7X/i, icao: "FA7X", manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 7X" },
  { re: /Falcon\s*8X/i, icao: "FA8X", manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 8X" },
  { re: /Falcon\s*900/i, icao: "F900", manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 900" },
  { re: /Falcon/i, icao: null, manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon" },
  { re: /G-?650|GVI\b/i, icao: "GLF6", manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G650" },
  { re: /G-?550|GV-?SP|GV\b/i, icao: "GLF5", manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G550" },
  { re: /G-?(450|IV)/i, icao: "GLF4", manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G450" },
  { re: /G-?200|Galaxy/i, icao: "GALX", manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G200" },
  { re: /G-?280/i, icao: "G280", manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G280" },
  { re: /G-?150/i, icao: "G150", manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G150" },
  { re: /Gulfstream/i, icao: null, manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream" },
  { re: /Hawker[\s-]*4000/i, icao: "HA4T", manufacturer: "Hawker Beechcraft", family: "Hawker", name: "Hawker 4000" },
  { re: /Hawker.*\b(800|850|900)\s*XPi?\b|Hawker\s*(800|850|900)|HS[\s-]?125|BAe[\s-]?125/i, icao: "H25B", manufacturer: "Hawker Beechcraft", family: "Hawker", name: "Hawker 800/850/900" },
  { re: /Premier/i, icao: "PRM1", manufacturer: "Hawker Beechcraft", family: "Premier", name: "Beechcraft Premier I" },
  { re: /Citation\s*(560\s*)?XLS?|560XL|Excel/i, icao: "C56X", manufacturer: "Cessna", family: "Citation", name: "Cessna Citation XLS" },
  { re: /Citation\s*CJ[1-4]|525/i, icao: "C25B", manufacturer: "Cessna", family: "Citation", name: "Cessna Citation CJ series" },
  { re: /Citation\s*(X|750)/i, icao: "C750", manufacturer: "Cessna", family: "Citation", name: "Cessna Citation X" },
  { re: /Citation\s*Sovereign|680/i, icao: "C680", manufacturer: "Cessna", family: "Citation", name: "Cessna Citation Sovereign" },
  { re: /Citation\s*Latitude/i, icao: "C68A", manufacturer: "Cessna", family: "Citation", name: "Cessna Citation Latitude" },
  { re: /Citation/i, icao: null, manufacturer: "Cessna", family: "Citation", name: "Cessna Citation" },
  { re: /King\s*Air\s*(B?)350|B300|350i?/i, icao: "B350", manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air 350" },
  { re: /King\s*Air\s*(B?)(200|250)|\bB\s?200|\bB250|SKA\s*B?200|KINGAIR\s*B?200/i, icao: "BE20", manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air 200" },
  { re: /King\s*Air\s*C?90|C90/i, icao: "BE9L", manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air C90" },
  { re: /King\s*Air/i, icao: null, manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air" },
  { re: /Pilatus|PC-?12/i, icao: "PC12", manufacturer: "Pilatus", family: "PC-12", name: "Pilatus PC-12" },
  { re: /PC-?24/i, icao: "PC24", manufacturer: "Pilatus", family: "PC-24", name: "Pilatus PC-24" },
  { re: /P-?68/i, icao: "P68", manufacturer: "Vulcanair / Partenavia", family: "P.68", name: "Partenavia P.68" },
  { re: /Cessna\s*R?172|C-?172/i, icao: "C172", manufacturer: "Cessna", family: "172", name: "Cessna 172" },
  { re: /Cessna\s*182|C-?182/i, icao: "C182", manufacturer: "Cessna", family: "182", name: "Cessna 182" },
  { re: /Cessna\s*T?206|T206H/i, icao: "C206", manufacturer: "Cessna", family: "206", name: "Cessna 206 Stationair" },
  { re: /Stemme|S6-?RT/i, icao: "S6", manufacturer: "Stemme", family: "S6", name: "Stemme S6" },
  { re: /P[\s.-]?180|Avanti/i, icao: "P180", manufacturer: "Piaggio", family: "P.180", name: "Piaggio P.180 Avanti" },
  { re: /Piper|PA-?\d/i, icao: null, manufacturer: "Piper", family: "Piper", name: "Piper" },
  { re: /Diamond|DA-?4[02]/i, icao: "DA42", manufacturer: "Diamond", family: "DA42", name: "Diamond DA42" },
  { re: /Tecnam|P2006/i, icao: "P06T", manufacturer: "Tecnam", family: "P2006T", name: "Tecnam P2006T" },
  // Helicopters
  { re: /AW[\s-]?139/i, icao: "A139", manufacturer: "Leonardo", family: "AW139", name: "Leonardo AW139" },
  { re: /AW[\s-]?169/i, icao: "A169", manufacturer: "Leonardo", family: "AW169", name: "Leonardo AW169" },
  { re: /AW[\s-]?109|\bA109|Agusta\s*(A)?109|GRAND\s+AGUSTA/i, icao: "A109", manufacturer: "Leonardo", family: "AW109", name: "Leonardo AW109" },
  { re: /AW[\s-]?119|Koala/i, icao: "A119", manufacturer: "Leonardo", family: "AW119", name: "Leonardo AW119 Koala" },
  { re: /H[\s-]?145|EC[\s-]?145|BK[\s-]?117/i, icao: "EC45", manufacturer: "Airbus Helicopters", family: "H145", name: "Airbus H145" },
  { re: /H[\s-]?135|EC[\s-]?135/i, icao: "EC35", manufacturer: "Airbus Helicopters", family: "H135", name: "Airbus H135" },
  { re: /H[\s-]?130|EC[\s-]?130/i, icao: "EC30", manufacturer: "Airbus Helicopters", family: "H130", name: "Airbus H130" },
  { re: /AS[\s-]?355|Ecureuil\s*2|Twin\s*Squirrel/i, icao: "AS55", manufacturer: "Airbus Helicopters", family: "AS355", name: "Airbus AS355 Ecureuil 2" },
  { re: /H[\s-]?125|AS[\s-]?350|Ecureuil|Squirrel/i, icao: "AS50", manufacturer: "Airbus Helicopters", family: "H125", name: "Airbus H125 (AS350)" },
  { re: /H-?160/i, icao: "H160", manufacturer: "Airbus Helicopters", family: "H160", name: "Airbus H160" },
  { re: /H-?175|EC-?175/i, icao: "EC75", manufacturer: "Airbus Helicopters", family: "H175", name: "Airbus H175" },
  { re: /[AS]{2}[\s-]?365|Dauphin|EC[\s-]?155|H[\s-]?155/i, icao: "AS65", manufacturer: "Airbus Helicopters", family: "Dauphin", name: "Airbus Dauphin (AS365)" },
  { re: /Bell\s*407/i, icao: "B407", manufacturer: "Bell", family: "Bell 407", name: "Bell 407" },
  { re: /Bell\s*412/i, icao: "B412", manufacturer: "Bell", family: "Bell 412", name: "Bell 412" },
  { re: /Bell\s*429/i, icao: "B429", manufacturer: "Bell", family: "Bell 429", name: "Bell 429" },
  { re: /Bell\s*505/i, icao: "B505", manufacturer: "Bell", family: "Bell 505", name: "Bell 505" },
  { re: /Bell\s*206|Jet\s*Ranger/i, icao: "B06", manufacturer: "Bell", family: "Bell 206", name: "Bell 206 JetRanger" },
  { re: /Bell\s*230|Bell\s*430/i, icao: "B430", manufacturer: "Bell", family: "Bell 430", name: "Bell 430" },
  { re: /Bell/i, icao: null, manufacturer: "Bell", family: "Bell", name: "Bell helicopter" },
  { re: /Robinson|R-?44/i, icao: "R44", manufacturer: "Robinson", family: "R44", name: "Robinson R44" },
  { re: /R-?66/i, icao: "R66", manufacturer: "Robinson", family: "R66", name: "Robinson R66" },
  { re: /S-?76/i, icao: "S76", manufacturer: "Sikorsky", family: "S-76", name: "Sikorsky S-76" },
  { re: /S-?92/i, icao: "S92", manufacturer: "Sikorsky", family: "S-92", name: "Sikorsky S-92" },
  { re: /Mi-?17|Mi-?172/i, icao: "MI17", manufacturer: "Mil", family: "Mi-17", name: "Mil Mi-172" },
  { re: /Dhruv|ALH/i, icao: "ALH", manufacturer: "HAL", family: "Dhruv", name: "HAL Dhruv" },
  { re: /Balloon|Ultramagic|Cameron|Lindstrand|Kubicek/i, icao: "BALL", manufacturer: "Hot air balloon", family: "Balloon", name: "Hot air balloon" },
];

export function classifyModel(model: string, wingHint: "FW" | "RW" | "B" | null): TypeInfo {
  for (const r of RULES) {
    if (r.re.test(model)) return { icao: r.icao, manufacturer: r.manufacturer, family: r.family, name: r.name ?? model };
  }
  return { icao: null, manufacturer: wingHint === "RW" ? "Other helicopter" : "Other", family: "Other", name: model };
}

/** Manufacturer inferred from an ICAO type code when tar1090 supplies one we do not have a rule for. */
export function manufacturerFromIcao(icao: string): string | null {
  if (/^A3\d\d|^A2\dN|^A19|^A20|^A21/.test(icao)) return "Airbus";
  if (/^B7|^B3\dM|^B77|^B78/.test(icao)) return "Boeing";
  if (/^AT[47]/.test(icao)) return "ATR";
  if (/^E\d\d|^E\d\dP|^E\d\dL/.test(icao)) return "Embraer";
  if (/^GL|^CL|^LJ|^CRJ/.test(icao)) return "Bombardier";
  if (/^F2TH|^FA\d|^F900/.test(icao)) return "Dassault";
  if (/^GLF|^GALX|^G280/.test(icao)) return "Gulfstream";
  if (/^C\d\d\d|^C56X|^C68A|^C25/.test(icao)) return "Cessna";
  if (/^BE|^B350/.test(icao)) return "Beechcraft";
  if (/^EC\d\d|^AS\d\d|^H1\d\d/.test(icao)) return "Airbus Helicopters";
  if (/^A1[0-9]{2}/.test(icao)) return "Leonardo";
  if (/^B4\d\d|^B06|^B505/.test(icao)) return "Bell";
  return null;
}

export function roleFromSeating(seatingRaw: string | null, ops: string | null, model: string): "passenger" | "cargo" | "aerial-work" | "mixed" | "unknown" {
  const s = `${seatingRaw ?? ""} ${model}`.toLowerCase();
  if (/freighter|cargo/.test(s) && !/\d/.test(seatingRaw ?? "")) return "cargo";
  if (/aerial/.test(s)) return "aerial-work";
  if (/\d/.test(seatingRaw ?? "")) {
    if (ops && /cargo/i.test(ops) && /passenger|pax/i.test(ops)) return "passenger";
    return "passenger";
  }
  return "unknown";
}


/** Canonical type identity per ICAO designator, used to merge spelling variants after enrichment. */
const CANON: Record<string, { manufacturer: string; family: string; name: string }> = {
  A109: { manufacturer: "Leonardo", family: "AW109", name: "Leonardo AW109" },
  A139: { manufacturer: "Leonardo", family: "AW139", name: "Leonardo AW139" },
  A169: { manufacturer: "Leonardo", family: "AW169", name: "Leonardo AW169" },
  B407: { manufacturer: "Bell", family: "Bell 407", name: "Bell 407" },
  B412: { manufacturer: "Bell", family: "Bell 412", name: "Bell 412" },
  B429: { manufacturer: "Bell", family: "Bell 429", name: "Bell 429" },
  B505: { manufacturer: "Bell", family: "Bell 505", name: "Bell 505" },
  B06: { manufacturer: "Bell", family: "Bell 206", name: "Bell 206 JetRanger" },
  BE20: { manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air 200" },
  B350: { manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air 350" },
  BE9L: { manufacturer: "Beechcraft", family: "King Air", name: "Beechcraft King Air C90" },
  CL60: { manufacturer: "Bombardier", family: "Challenger", name: "Bombardier Challenger 600 series" },
  CL30: { manufacturer: "Bombardier", family: "Challenger", name: "Bombardier Challenger 300/350" },
  D228: { manufacturer: "Dornier / HAL", family: "Do 228", name: "Dornier 228" },
  E135: { manufacturer: "Embraer", family: "ERJ", name: "Embraer ERJ 135" },
  E35L: { manufacturer: "Embraer", family: "Legacy", name: "Embraer Legacy 600/650" },
  E170: { manufacturer: "Embraer", family: "E-Jet", name: "Embraer E170" },
  E145: { manufacturer: "Embraer", family: "ERJ", name: "Embraer ERJ 145" },
  EC35: { manufacturer: "Airbus Helicopters", family: "H135", name: "Airbus H135" },
  EC45: { manufacturer: "Airbus Helicopters", family: "H145", name: "Airbus H145" },
  EC30: { manufacturer: "Airbus Helicopters", family: "H130", name: "Airbus H130" },
  AS50: { manufacturer: "Airbus Helicopters", family: "H125", name: "Airbus H125 (AS350)" },
  AS55: { manufacturer: "Airbus Helicopters", family: "AS355", name: "Airbus AS355 Ecureuil 2" },
  AS65: { manufacturer: "Airbus Helicopters", family: "Dauphin", name: "Airbus Dauphin (AS365)" },
  H160: { manufacturer: "Airbus Helicopters", family: "H160", name: "Airbus H160" },
  G150: { manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G150" },
  GALX: { manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G200" },
  GLF4: { manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G450" },
  GLF5: { manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G550" },
  GLF6: { manufacturer: "Gulfstream", family: "Gulfstream", name: "Gulfstream G650" },
  H25B: { manufacturer: "Hawker Beechcraft", family: "Hawker", name: "Hawker 800/850/900" },
  HA4T: { manufacturer: "Hawker Beechcraft", family: "Hawker", name: "Hawker 4000" },
  C56X: { manufacturer: "Cessna", family: "Citation", name: "Cessna Citation XLS" },
  C25B: { manufacturer: "Cessna", family: "Citation", name: "Cessna Citation CJ series" },
  C208: { manufacturer: "Cessna", family: "Caravan", name: "Cessna 208 Grand Caravan" },
  PC12: { manufacturer: "Pilatus", family: "PC-12", name: "Pilatus PC-12" },
  PC24: { manufacturer: "Pilatus", family: "PC-24", name: "Pilatus PC-24" },
  LJ45: { manufacturer: "Bombardier", family: "Learjet", name: "Learjet 40/45" },
  F2TH: { manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 2000" },
  FA7X: { manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 7X" },
  F900: { manufacturer: "Dassault", family: "Falcon", name: "Dassault Falcon 900" },
  GLEX: { manufacturer: "Bombardier", family: "Global", name: "Bombardier Global Express" },
  GL5T: { manufacturer: "Bombardier", family: "Global", name: "Bombardier Global 5000/5500/6000/6500" },
  GL7T: { manufacturer: "Bombardier", family: "Global", name: "Bombardier Global 7500" },
  AT76: { manufacturer: "ATR", family: "ATR 72", name: "ATR 72-600" },
  AT46: { manufacturer: "ATR", family: "ATR 42", name: "ATR 42" },
  DH8D: { manufacturer: "De Havilland Canada", family: "Dash 8", name: "Dash 8 Q400" },
  R44: { manufacturer: "Robinson", family: "R44", name: "Robinson R44" },
  R66: { manufacturer: "Robinson", family: "R66", name: "Robinson R66" },
  S76: { manufacturer: "Sikorsky", family: "S-76", name: "Sikorsky S-76" },
  P180: { manufacturer: "Piaggio", family: "P.180", name: "Piaggio P.180 Avanti" },
  C172: { manufacturer: "Cessna", family: "172", name: "Cessna 172" },
  C206: { manufacturer: "Cessna", family: "206", name: "Cessna 206 Stationair" },
  P68: { manufacturer: "Vulcanair / Partenavia", family: "P.68", name: "Partenavia P.68" },
};

/**
 * Merge spelling variants: when the ICAO designator (from the rule or the tar1090
 * database) has a canonical identity, use it. Boeing 737 MAX and 737 NG variants keep
 * their model-specific names because they are genuinely different aircraft.
 */
export function canonicalizeType(info: TypeInfo, icaoHint: string | null): TypeInfo {
  const icao = info.icao ?? icaoHint;
  if (!icao) return info;
  const c = CANON[icao];
  if (!c) return { ...info, icao };
  return { icao, manufacturer: c.manufacturer, family: c.family, name: c.name };
}
