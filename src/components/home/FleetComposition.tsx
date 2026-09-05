import type { Meta, Operator } from "@/lib/types";

/** Stub: replaced by the home-composition agent. */
export function FleetComposition({ operators, counts }: { operators: Operator[]; counts: Meta["counts"] }) {
  return <div className="label text-ink-3">Fleet composition: {operators.length} operators, {counts.aircraft} aircraft</div>;
}
