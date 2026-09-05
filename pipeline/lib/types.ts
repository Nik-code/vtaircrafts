export type OperatorCategory = "scheduled" | "non-scheduled";
export type Wing = "FW" | "RW" | "B";

export interface RawAircraft {
  reg: string;
  operatorSeq: number;
  operatorName: string;
  operatorBrandRaw: string | null;
  category: OperatorCategory;
  permitNo: string | null;
  validUntil: string | null;
  model: string;
  seatingRaw: string | null;
  wing: Wing | null;
  ops: string | null;
  page: number;
}

export interface RawOperator {
  seq: number;
  name: string;
  brandRaw: string | null;
  category: OperatorCategory;
  permitNo: string | null;
  validUntil: string | null;
  statedCount: number | null;
  fleetCode: string | null;
  ops: string | null;
  firstPage: number;
}

export interface Issue {
  level: "warn" | "error";
  message: string;
  page?: number;
}

export interface ParseResult {
  asOn: string | null;
  category: OperatorCategory;
  operators: RawOperator[];
  aircraft: RawAircraft[];
  issues: Issue[];
}
