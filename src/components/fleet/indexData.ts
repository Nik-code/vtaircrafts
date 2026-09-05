import type { AircraftImage, IndexRecord, Wing } from "@/lib/types";

/**
 * The slim client index is fetched once per page load and shared by the fleet
 * explorer and the global search palette through this module-scope promise.
 */
let pending: Promise<IndexRecord[]> | null = null;

export function loadIndex(): Promise<IndexRecord[]> {
  if (!pending) {
    pending = fetch("/data/latest/index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<IndexRecord[]>;
      })
      .catch((err: unknown) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

export const WING_LABEL: Record<Wing, string> = {
  FW: "Fixed wing",
  RW: "Rotary wing",
  B: "Balloon",
};

export const CATEGORY_LABEL: Record<string, string> = {
  S: "Scheduled",
  N: "Non-scheduled",
};

export const ROLE_LABEL: Record<string, string> = {
  passenger: "Passenger",
  cargo: "Cargo",
  "aerial-work": "Aerial work",
  mixed: "Mixed",
  unknown: "Not stated",
};

const TIERS = ["exact", "operator-type", "type"] as const;

/** Rebuild the minimum AircraftImage a Plate needs from an index record. */
export function plateImage(i: IndexRecord["i"]): AircraftImage | null {
  if (!i) return null;
  return {
    file: "",
    src: i[0],
    width: 0,
    height: 0,
    author: null,
    license: null,
    licenseUrl: null,
    pageUrl: "",
    date: null,
    tier: TIERS[i[1]] ?? "type",
    ofReg: null,
  };
}
