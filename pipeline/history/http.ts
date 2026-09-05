// Shared polite HTTP helper for the history pipeline.
// Sequential callers only; retries with exponential backoff on 429/5xx.
export const UA =
  "vtaircrafts.in/0.1 (https://github.com/Nik-code/vtaircrafts; mailto:priyanshnikka@gmail.com)";

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface GetOptions {
  /** attempts including the first (default 5) */
  tries?: number;
  /** base backoff in ms (default 2000) */
  backoff?: number;
  /** politeness delay applied before every request (default 1200ms) */
  delay?: number;
  /** treat these status codes as a soft miss and return null instead of throwing */
  softFail?: number[];
  /** return null instead of throwing when every attempt fails */
  optional?: boolean;
}

/** GET a URL as raw bytes, retrying on 429/5xx and network errors. */
export async function getBuffer(url: string, opts: GetOptions = {}): Promise<Buffer | null> {
  const tries = opts.tries ?? 5;
  const backoff = opts.backoff ?? 2000;
  const delay = opts.delay ?? 1200;
  const soft = new Set(opts.softFail ?? [404, 403]);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    if (delay) await sleep(delay);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (soft.has(res.status)) {
        console.warn(`  ! HTTP ${res.status} ${url}`);
        return null;
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        const wait = backoff * 2 ** attempt;
        console.warn(`  … HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastError = e;
      const wait = backoff * 2 ** attempt;
      console.warn(`  … ${(e as Error).message}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
  if (opts.optional) {
    console.warn(`  ! giving up on ${url}: ${String(lastError)}`);
    return null;
  }
  throw new Error(`giving up on ${url}: ${String(lastError)}`);
}

export async function getText(url: string, opts: GetOptions = {}): Promise<string | null> {
  const b = await getBuffer(url, opts);
  return b ? b.toString("utf8") : null;
}

/** %PDF magic bytes — Wayback happily serves HTML error pages with a .pdf URL. */
export function isPdf(buf: Buffer): boolean {
  return buf.length > 4 && buf.subarray(0, 4).toString("latin1") === "%PDF";
}
