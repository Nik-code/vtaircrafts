import styles from "./composition.module.css";
import { Callouts, Patterns } from "./parts";
import {
  CX,
  CY,
  R_ANN_IN,
  R_ANN_OUT,
  R_OUT,
  VB_H,
  VB_W,
  annularSector,
  bladeSpar,
  layoutCallouts,
  polar,
  rotorBlade,
  svgFills,
  tickRing,
  type Share,
} from "./share";

const PREFIX = "rw";
const BLADES = [45, 135, 225, 315];
const R_BLADE_ROOT = 24;
const R_BLADE_TIP = 88;
const BOLTS = Array.from({ length: 8 }, (_, i) => polar(CX, CY, 17, i * 45));

/**
 * Plan view of the airframe under the disc. Overall length is a little under
 * the rotor diameter, as it is on a real machine.
 */
const BODY = [
  `M ${CX} ${CY - 58}`,
  `C ${CX + 13} ${CY - 58} ${CX + 24} ${CY - 38} ${CX + 24} ${CY - 16}`,
  `C ${CX + 24} ${CY + 2} ${CX + 20} ${CY + 13} ${CX + 12} ${CY + 20}`,
  `L ${CX + 6} ${CY + 62}`,
  `L ${CX + 8} ${CY + 74}`,
  `L ${CX - 8} ${CY + 74}`,
  `L ${CX - 6} ${CY + 62}`,
  `L ${CX - 12} ${CY + 20}`,
  `C ${CX - 20} ${CY + 13} ${CX - 24} ${CY + 2} ${CX - 24} ${CY - 16}`,
  `C ${CX - 24} ${CY - 38} ${CX - 13} ${CY - 58} ${CX} ${CY - 58}`,
  "Z",
].join(" ");
const FIN = `M ${CX - 8} ${CY + 74} L ${CX - 4} ${CY + 88} L ${CX + 7} ${CY + 88} L ${CX + 8} ${CY + 74} Z`;
/** Skid tubes, set wide enough that the cross tubes show outboard of the cabin. */
const SKIDS = [
  `M ${CX - 32} ${CY - 36} L ${CX - 32} ${CY + 22}`,
  `M ${CX + 32} ${CY - 36} L ${CX + 32} ${CY + 22}`,
  `M ${CX - 32} ${CY - 18} L ${CX + 32} ${CY - 18}`,
  `M ${CX - 32} ${CY + 6} L ${CX + 32} ${CY + 6}`,
].join(" ");

/**
 * Plan view of a four-blade main rotor over its airframe. The swept disc is
 * drawn as a band divided by operator share of the rotary fleet.
 */
export function Rotor({ share }: { share: Share }) {
  const fills = svgFills(PREFIX);
  const callouts = layoutCallouts(share);

  return (
    <svg className={styles.svg} viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-labelledby={`${PREFIX}-t`}>
      <title id={`${PREFIX}-t`}>Main rotor plan view: rotary-wing fleet share by operator</title>
      <Patterns prefix={PREFIX} />

      <g className={styles.zoomRotor}>
        {/* Swept disc boundary and the per-cent scale */}
        <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke="var(--rule-2)" strokeWidth="1" strokeDasharray="5 5" />
        <path d={tickRing(CX, CY, share.start)} stroke="var(--ink-3)" strokeWidth="0.9" fill="none" />

        {/* Share of the rotary fleet, drawn to scale */}
        <g>
          {share.segments.map((s) => (
            <path
              key={s.key}
              className={styles.arc}
              d={annularSector(CX, CY, R_ANN_IN, R_ANN_OUT, s.a0 + 0.3, s.a1 - 0.3)}
              fill={fills[s.fill]}
              stroke="var(--ink)"
              strokeWidth="0.8"
            />
          ))}
        </g>

        {/* Tip path */}
        <circle cx={CX} cy={CY} r={R_BLADE_TIP + 1} fill="none" stroke="var(--rule-2)" strokeWidth="0.9" strokeDasharray="3 4" />

        {/* Airframe: skids first, so the cross tubes pass under the cabin */}
        <path d={SKIDS} fill="none" stroke="var(--rule)" strokeWidth="1.4" strokeLinecap="round" />
        <path d={BODY} fill="var(--paper)" stroke="var(--ink-2)" strokeWidth="1.1" strokeLinejoin="round" />
        <rect x={CX - 30} y={CY + 52} width="60" height="8" rx="2" fill="var(--paper)" stroke="var(--ink-2)" strokeWidth="1.1" />
        <path d={FIN} fill="var(--paper-2)" stroke="var(--ink-2)" strokeWidth="1.1" strokeLinejoin="round" />
        <path
          d={`M ${CX + 13} ${CY + 58} L ${CX + 13} ${CY + 90}`}
          stroke="var(--ink-2)"
          strokeWidth="1.1"
          strokeDasharray="3 3"
        />
        <circle cx={CX + 13} cy={CY + 74} r="2.5" fill="var(--ink-2)" />

        {/* Rotor head */}
        <circle cx={CX} cy={CY} r="30" fill="none" stroke="var(--rule-2)" strokeWidth="0.9" strokeDasharray="2 3" />
        <g className={styles.rotor} pointerEvents="none">
          {BLADES.map((a) => (
            <g key={a}>
              <path
                d={rotorBlade(CX, CY, a, R_BLADE_ROOT, R_BLADE_TIP, 6.5, 4.6)}
                fill="var(--paper-2)"
                stroke="var(--ink)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <path d={bladeSpar(CX, CY, a, R_BLADE_ROOT + 6, R_BLADE_TIP - 10)} stroke="var(--rule-2)" strokeWidth="0.8" />
              <path
                d={rotorBlade(CX, CY, a, 11, 29, 8, 6.5)}
                fill="var(--paper-3)"
                stroke="var(--ink)"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
            </g>
          ))}
          <circle cx={CX} cy={CY} r="21" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="1.2" />
          {BOLTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="var(--ink-2)" />
          ))}
          <circle cx={CX} cy={CY} r="7" fill="var(--ink)" />
        </g>
      </g>

      <Callouts items={callouts} />
    </svg>
  );
}
