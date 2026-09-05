import { ButtonLink } from "@/components/ui/Button";
import { fmtInt } from "@/lib/format";
import type { Meta, Operator } from "@/lib/types";
import { JetEngine } from "./composition/JetEngine";
import { Rotor } from "./composition/Rotor";
import styles from "./composition/composition.module.css";
import { buildShare, cssFills, fmtPct, type Share } from "./composition/share";

/** Names and shares for the narrow layout, where the callouts are hidden. */
function Legend({ share }: { share: Share }) {
  return (
    <ul className={`${styles.legend} mt-4 flex-wrap justify-center gap-x-4 gap-y-2`}>
      {share.segments.map((s) => (
        <li key={s.key} className="label flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 border border-ink"
            style={{ background: cssFills[s.fill] }}
          />
          <span className={s.others ? "text-ink-2" : "text-ink"}>{s.name}</span>
          <span className="text-ink-3">{fmtPct(s.pct)}</span>
        </li>
      ))}
    </ul>
  );
}

function Caption({ fig, wing, aircraft, operators }: { fig: string; wing: string; aircraft: number; operators: number }) {
  return (
    <figcaption className="label mt-4 text-center">
      <span className="text-ink">FIG. {fig}</span>
      <span className="px-2 text-rule-2">/</span>
      {wing} · {fmtInt(aircraft)} aircraft · {fmtInt(operators)} operators
    </figcaption>
  );
}

/**
 * Sheet 02, figures 02 and 03: how the fixed-wing and rotary fleets divide
 * between operators, drawn as a turbofan and a main rotor. A summary, not a
 * directory: six named operators per figure and everything else in one share.
 */
export function FleetComposition({ operators, counts }: { operators: Operator[]; counts: Meta["counts"] }) {
  const fw = buildShare(operators, "FW", counts.fixedWing);
  const rw = buildShare(operators, "RW", counts.rotary);

  return (
    <div>
      <div className="grid gap-14 min-[1200px]:grid-cols-2 min-[1200px]:gap-4">
        <figure className={styles.figure}>
          <JetEngine share={fw} />
          <Caption fig="02" wing="Fixed wing" aircraft={fw.total} operators={fw.operators} />
          <Legend share={fw} />
        </figure>
        <figure className={styles.figure}>
          <Rotor share={rw} />
          <Caption fig="03" wing="Rotary" aircraft={rw.total} operators={rw.operators} />
          <Legend share={rw} />
        </figure>
      </div>

      <div className="rule-h mt-12 flex flex-wrap items-center justify-between gap-3 pt-4">
        <p className="label label-dim">Six largest operators drawn in each figure</p>
        <ButtonLink href="/operators" tone="ghost">
          All operators →
        </ButtonLink>
      </div>
    </div>
  );
}
