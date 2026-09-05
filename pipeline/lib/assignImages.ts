// Assign a photograph to every aircraft from the Commons cache.
// Tiers: exact tail, same operator + type, same type at another Indian operator,
// then (to be added by the images pipeline) same type anywhere in the world.
import type { CommonsImage } from "../images";

export type ImageTier = "exact" | "operator-type" | "type" | "type-world";

export interface ImageAssignable {
  reg: string;
  operatorId: string;
  model: string;
  type: { name: string };
  image: (CommonsImage & { tier: ImageTier; ofReg: string | null }) | null;
}

export interface ImageCacheEntry {
  checkedAt: string;
  image: CommonsImage | null;
  category: boolean;
}

export type ImageCache = Record<string, ImageCacheEntry>;

function pickStable(regs: string[] | undefined, seed: string): string | null {
  if (!regs?.length) return null;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return regs[h % regs.length];
}

export function assignImages(aircraft: ImageAssignable[], cache: ImageCache): Record<ImageTier | "none", number> {
  const exact = new Map<string, CommonsImage>();
  for (const a of aircraft) {
    const img = cache[a.reg]?.image;
    if (img) exact.set(a.reg, img);
  }
  const byOpType = new Map<string, string[]>();
  const byType = new Map<string, string[]>();
  for (const a of aircraft) {
    if (!exact.has(a.reg)) continue;
    const k1 = `${a.operatorId}|${a.type.name}`;
    byOpType.set(k1, [...(byOpType.get(k1) ?? []), a.reg]);
    byType.set(a.type.name, [...(byType.get(a.type.name) ?? []), a.reg]);
  }
  const counts: Record<ImageTier | "none", number> = { exact: 0, "operator-type": 0, type: 0, "type-world": 0, none: 0 };
  for (const a of aircraft) {
    if (exact.has(a.reg)) { a.image = { ...exact.get(a.reg)!, tier: "exact", ofReg: a.reg }; counts.exact++; continue; }
    const r1 = pickStable(byOpType.get(`${a.operatorId}|${a.type.name}`), a.reg);
    if (r1) { a.image = { ...exact.get(r1)!, tier: "operator-type", ofReg: r1 }; counts["operator-type"]++; continue; }
    const r2 = a.type.name !== a.model ? pickStable(byType.get(a.type.name), a.reg) : null;
    if (r2) { a.image = { ...exact.get(r2)!, tier: "type", ofReg: r2 }; counts.type++; continue; }
    a.image = null;
    counts.none++;
  }
  return counts;
}
