import styles from "./composition.module.css";
import { LINE_H, SWATCH, type Callout } from "./share";

/**
 * Engineering callouts: a dot on the share ring, a bent hairline leader, a
 * brand-colour swatch, then the name. The swatch is the only place besides
 * the ring itself that carries the operator's colour.
 */
export function Callouts({ items }: { items: Callout[] }) {
  return (
    <g className={styles.callouts}>
      {items.map((c) => (
        <g key={c.key} className={styles.callout}>
          <path className={styles.lead} d={c.d} fill="none" stroke="var(--ink-3)" strokeWidth="1" />
          <circle className={styles.dot} cx={c.dotX} cy={c.dotY} r="2" fill="var(--ink-3)" />
          <rect
            className={styles.swatch}
            x={c.swatchX}
            y={c.swatchY}
            width={SWATCH}
            height={SWATCH}
            fill={c.color}
            stroke={c.others ? "var(--ink-2)" : "var(--ink)"}
            strokeWidth="0.75"
          />
          {c.lines.map((line, i) => (
            <text
              key={line}
              className={`label ${styles.name}`}
              x={c.textX}
              y={c.baseY + i * LINE_H}
              textAnchor={c.anchor}
              fill={c.others ? "var(--ink-2)" : "var(--ink)"}
            >
              {line}
            </text>
          ))}
          <text
            className="label"
            x={c.textX}
            y={c.baseY + c.lines.length * LINE_H}
            textAnchor={c.anchor}
            fill="var(--ink-3)"
          >
            {c.pct}
          </text>
        </g>
      ))}
    </g>
  );
}
