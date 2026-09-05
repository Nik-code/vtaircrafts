/** Deterministic decorative barcode derived from a string (not a real symbology). */
export function Barcode({ seed, height = 34, className = "" }: { seed: string; height?: number; className?: string }) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const bars: Array<{ x: number; w: number }> = [];
  let x = 0;
  for (let i = 0; i < 46; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const w = 1 + (h % 3);
    bars.push({ x, w });
    x += w + 1 + ((h >>> 8) % 2);
  }
  return (
    <svg viewBox={`0 0 ${x} ${height}`} height={height} className={className} preserveAspectRatio="none" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="currentColor" />
      ))}
    </svg>
  );
}
