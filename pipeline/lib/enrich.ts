import { createReadStream, existsSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

export interface HexRecord {
  hex: string;
  reg: string;
  icaoType: string | null;
  description: string | null;
}

/**
 * Load VT- rows from the tar1090-db aircraft.csv.gz (readsb/Mictronics database).
 * Format: hex;reg;icaoType;flags;description;...
 */
export async function loadHexDatabase(gzPath: string): Promise<Map<string, HexRecord>> {
  const out = new Map<string, HexRecord>();
  if (!existsSync(gzPath)) return out;
  const rl = createInterface({ input: createReadStream(gzPath).pipe(createGunzip()) });
  for await (const line of rl) {
    if (!line.includes(";VT-")) continue;
    const [hex, reg, icaoType, , description] = line.split(";");
    if (!reg?.startsWith("VT-")) continue;
    out.set(reg.toUpperCase(), {
      hex: hex.toUpperCase(),
      reg: reg.toUpperCase(),
      icaoType: icaoType || null,
      description: description || null,
    });
  }
  return out;
}
