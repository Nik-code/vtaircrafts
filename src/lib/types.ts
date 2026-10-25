export type Wing = "FW" | "RW" | "B";
export type Category = "scheduled" | "non-scheduled";
export type ImageTier = "exact" | "operator-type" | "type" | "type-world";

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
  ofReg: string | null;
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
  history?: AircraftHistory;
}

export interface AircraftHistory {
  firstSnapshot: string;
  registeredOn: string | null;
  deregisteredOn: string | null;
  msn: string | null;
  yearOfManufacture: number | null;
  owner: string | null;
  lessor: string | null;
}

export type EventKind = "registered" | "deregistered" | "owner-change" | "added" | "removed" | "moved" | "snapshot";

export interface Event {
  id: string;
  kind: EventKind;
  reg: string | null;
  date: string | null;
  from: string | null;
  to: string | null;
  list: Category | null;
  operator?: string;
  operatorId?: string;
  fromOperator?: string;
  fromOperatorId?: string;
  toOperator?: string;
  toOperatorId?: string;
  model?: string;
  type?: string;
  msn?: string;
  owner?: string;
  lessor?: string;
  source: { kind: "dgca" | "wayback" | "report"; file: string; url: string | null };
  note?: string;
}

export interface SnapshotInfo {
  date: string;
  list: Category;
  source: "dgca" | "wayback";
  url: string | null;
  sha256: string;
  aircraft: number;
  operators: number;
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

/** A stretch of time a registration spent on one operator's permit; ends are snapshot intervals. */
export interface Stint {
  operatorId: string;
  operator: string;
  list: Category;
  start: { from: string | null; to: string };
  end: { from: string; to: string } | null;
}

/** A registration seen in DGCA reports or old lists that is not on any permit today (archive.json). */
export interface ArchivedAircraft {
  reg: string;
  model: string | null;
  type: { icao: string | null; manufacturer: string; family: string; name: string };
  msn: string | null;
  owner: string | null;
  lessor: string | null;
  registeredOn: string | null;
  deregisteredOn: string | null;
  stints: Stint[];
  /** Listed by a flying training organisation in DGCA's FTO list (training.json). */
  training: { ftoId: string; fto: string; asOn: string } | null;
  status: "deregistered" | "off-permit" | "register-only" | "training";
}

export interface TrainingOrg {
  id: string;
  seq: number;
  name: string;
  bases: string[];
  ownership: string | null;
  approvalNo: string | null;
  validFrom: string | null;
  validUntil: string | null;
  singleEngine: number | null;
  multiEngine: number | null;
  aircraft: Array<{ reg: string; model: string; type: { icao: string | null; manufacturer: string; family: string; name: string }; section: string }>;
  remarks: string | null;
  page: number;
}

export interface TrainingList {
  asOn: string;
  source: { url: string; sha256: string; file?: string };
  ftos: TrainingOrg[];
}

/** An operator that appears in old list captures but holds no permit today (past-operators.json). */
export interface PastOperator {
  id: string;
  name: string;
  lists: Category[];
  regs: string[];
  firstSeen: string;
  lastSeen: string;
}

/** Per-registration facts from model strings and VRS standing-data (enrich.json). */
export interface Enrichment {
  engine: string | null;
  engineSource: "model" | "type" | null;
  builtYear: number | null;
  msn: string | null;
  vrsModel: string | null;
}

export interface TypeSpec {
  icao: string;
  engines: number | null;
  engineKind: "jet" | "turboprop" | "piston" | "electric" | null;
  wake: "L" | "M" | "H" | "J" | null;
}
