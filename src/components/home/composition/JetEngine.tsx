import styles from "./composition.module.css";
import { Callouts, Patterns } from "./parts";
import {
  CX,
  CY,
  FAN_BLADES,
  R_ANN_IN,
  R_ANN_OUT,
  R_CASE,
  R_LIP_IN,
  R_OUT,
  R_ROOT,
  R_SPIN,
  VB_H,
  VB_W,
  annularSector,
  bladeOwners,
  fanBlade,
  layoutCallouts,
  polar,
  spiral,
  svgFills,
  tickRing,
  type Share,
} from "./share";

const PREFIX = "fw";
const PITCH = 360 / FAN_BLADES;
const CHORD_ROOT = 7.6;
const CHORD_TIP = 7;
const SWEEP = 15;
/** Rivets around the intake lip. */
const RIVETS = Array.from({ length: 12 }, (_, i) => polar(CX, CY, 121, -90 + i * 30));

/** Rotation of blade slot `j`, so its mid-chord sits on the slot centre line. */
function bladeAngle(start: number, j: number): number {
  return Math.round((start + (j + 0.5) * PITCH - SWEEP / 2 - (CHORD_ROOT + CHORD_TIP) / 4) * 100) / 100;
}

/**
 * Front view of a high-bypass turbofan. The fan blades are grouped by operator
 * share of the fixed-wing fleet; the ring around the fan carries the same
 * shares drawn to scale against a per-cent tick scale.
 */
export function JetEngine({ share }: { share: Share }) {
  const fills = svgFills(PREFIX);
  const owners = bladeOwners(share);
  const callouts = layoutCallouts(share);

  return (
    <svg className={styles.svg} viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-labelledby={`${PREFIX}-t`}>
      <title id={`${PREFIX}-t`}>Turbofan front view: fixed-wing fleet share by operator</title>
      <Patterns prefix={PREFIX} />
      <defs>
        <path id={`${PREFIX}-blade`} d={fanBlade(CX, CY, 0, CHORD_ROOT, CHORD_TIP, SWEEP)} />
      </defs>

      <g className={styles.zoomFan}>
        {/* Nacelle: intake lip, then the fan bay */}
        <circle cx={CX} cy={CY} r={R_OUT} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="1.6" />
        <circle cx={CX} cy={CY} r={R_LIP_IN} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
        {RIVETS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="var(--rule-2)" />
        ))}

        {/* Per-cent scale, majors every ten */}
        <path d={tickRing(CX, CY, share.start)} stroke="var(--ink-3)" strokeWidth="0.9" fill="none" />

        {/* Share of the fixed-wing fleet, drawn to scale */}
        <g stroke="var(--ink)" strokeWidth="0.8">
          {share.segments.map((s) => (
            <path
              key={s.key}
              className={styles.arc}
              d={annularSector(CX, CY, R_ANN_IN, R_ANN_OUT, s.a0 + 0.3, s.a1 - 0.3)}
              fill={fills[s.fill]}
            />
          ))}
        </g>

        {/* Fan */}
        <circle cx={CX} cy={CY} r={R_CASE} fill="var(--paper)" stroke="var(--rule-2)" strokeWidth="1" />
        <g className={styles.fan} pointerEvents="none">
          <g stroke="var(--ink)" strokeWidth="0.7" strokeLinejoin="round">
            {owners.map((owner, j) => (
              <use
                key={j}
                href={`#${PREFIX}-blade`}
                transform={`rotate(${bladeAngle(share.start, j)} ${CX} ${CY})`}
                fill={fills[share.segments[owner].fill]}
              />
            ))}
          </g>
          <circle cx={CX} cy={CY} r={R_ROOT + 1} fill="var(--paper-2)" stroke="var(--rule-2)" strokeWidth="1" />
          <circle cx={CX} cy={CY} r={R_SPIN} fill="var(--ink)" />
          <path d={spiral(CX, CY, 3, 27, 1.25, -90)} fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>

      <Callouts items={callouts} />
    </svg>
  );
}
