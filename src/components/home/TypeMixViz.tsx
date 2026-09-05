import type { Wing } from "@/lib/types";
import type { TypeRow } from "./derive";

/** Stub: replaced by the home-typemix agent. */
export function TypeMixViz({ rows, total, wings }: { rows: TypeRow[]; total: number; wings: Record<Wing, number> }) {
  return <div className="label text-ink-3">Type mix: {rows.length} types, {total} aircraft, {wings.FW} fixed wing</div>;
}
