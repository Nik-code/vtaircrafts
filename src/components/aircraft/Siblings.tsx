import Link from "next/link";
import type { Aircraft } from "@/lib/types";
import { SectionHeader } from "@/components/ui/Container";

/** Other airframes of the same type at the same operator. */
export function Siblings({ aircraft, operatorName, siblings }: { aircraft: Aircraft; operatorName: string; siblings: Aircraft[] }) {
  if (siblings.length === 0) return null;
  return (
    <section className="mt-16">
      <SectionHeader
        title={`Same type at ${operatorName}`}
        meta={siblings.length}
        action={
          <Link href={`/fleet?o=${aircraft.operatorId}&t=${encodeURIComponent(aircraft.type.name)}`} className="text-[15px] text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">
            Open in the fleet
          </Link>
        }
      />
      <ul className="flex flex-wrap gap-2">
        {siblings.map((s) => (
          <li key={s.reg}>
            <Link href={`/aircraft/${s.reg}`} className="chip mono">
              {s.reg}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
