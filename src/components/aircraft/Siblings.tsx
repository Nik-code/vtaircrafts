import Link from "next/link";
import type { Aircraft } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";

/** Registration chips for other airframes of the same type at the same operator. */
export function Siblings({ aircraft, operatorName, siblings }: { aircraft: Aircraft; operatorName: string; siblings: Aircraft[] }) {
  if (siblings.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label">Same type at {operatorName} · {siblings.length}</h2>
        <ButtonLink href={`/fleet?o=${aircraft.operatorId}&t=${encodeURIComponent(aircraft.type.name)}`} tone="ghost">
          Open in explorer
        </ButtonLink>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {siblings.map((s) => (
          <Link
            key={s.reg}
            href={`/aircraft/${s.reg}`}
            className={`mono border px-2 py-1 text-xs transition-colors duration-150 hover:border-signal hover:text-signal ${
              s.image?.tier === "exact" ? "border-ink text-ink" : "border-rule-2 text-ink-2"
            }`}
          >
            {s.reg}
          </Link>
        ))}
      </div>
    </section>
  );
}
