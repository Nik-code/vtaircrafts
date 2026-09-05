import type { Event } from "@/lib/types";

/**
 * The full event log is ~2.9 MB of JSON; it is fetched once client-side (module-scope
 * cache, same pattern as `fleet/indexData.ts`) rather than embedded in the page HTML.
 */
let pending: Promise<Event[]> | null = null;

export function loadEvents(): Promise<Event[]> {
  if (!pending) {
    pending = fetch("/data/latest/events.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Event[]>;
      })
      .catch((err: unknown) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}
