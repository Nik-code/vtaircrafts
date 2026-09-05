export type Wing = "FW" | "RW" | "B";
export type Category = "scheduled" | "non-scheduled";
export type ImageTier = "exact" | "operator-type" | "type";

export interface AircraftImage {
  file: string;
  src: string;
  width: number;
  height: number;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  pageUrl: string;
  date: string | null;
  tier: ImageTier;
  ofReg: string;
}

export interface Aircraft {
  reg: string;
  hex: string | null;
  operatorId: string;
  operator: string;
  operatorLegal: string;
  category: Category;
  permit: { no: string | null; validUntil: string | null };
  model: string;
  type: { icao: string | null; manufacturer: string; family: string; name: string };
  wing: Wing;
  seats: number | null;
  seatsRaw: string | null;
  role: "passenger" | "cargo" | "aerial-work" | "mixed" | "unknown";
  image: AircraftImage | null;
  source: { file: string; asOn: string; page: number };
  firstSeen: string;
}

export interface Operator {
  id: string;
  name: string;
  legalName: string;
  category: Category;
  website: string | null;
  permit: { no: string | null; validUntil: string | null };
  ops: string | null;
  fleetCount: number;
  statedCount: number | null;
  types: Array<{ name: string; icao: string | null; manufacturer: string; count: number }>;
  wings: Record<Wing, number>;
  seatsTotal: number;
  heroReg: string | null;
}

/** Slim record shipped to the client-side explorer. */
export interface IndexRecord {
  r: string;            // reg
  h: string | null;     // hex
  o: string;            // operatorId
  on: string;           // operator name
  c: "S" | "N";         // category
  m: string;            // model as printed
  t: string;            // type name
  ti: string | null;    // icao type
  mf: string;           // manufacturer
  w: Wing;
  s: number | null;     // seats
  ro: Aircraft["role"];
  i: [string, 0 | 1 | 2] | null; // [src, tier]
  f: string;            // first seen
}

export interface Meta {
  generatedAt: string;
  snapshot: string;
  previous: string | null;
  sources: Array<{ category: Category; file: string; asOn: string | null; url: string; sha256: string | null; bytes: number | null; operators: number; aircraft: number }>;
  counts: Record<string, number>;
  issues: Array<{ level: string; message: string; category: string; page?: number }>;
}

export interface ChangeEntry { reg: string; operator: string; operatorId: string; model: string; type: string }
export interface MoveEntry { reg: string; from: string; fromId: string; to: string; toId: string; model: string }
export interface Changes { from: string; to: string; scope: Category[]; added: ChangeEntry[]; removed: ChangeEntry[]; moved: MoveEntry[] }
