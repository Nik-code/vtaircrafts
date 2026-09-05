import styles from "./composition.module.css";
import { LINE_H, type Callout } from "./share";

/** Hatch patterns, scoped per figure so the two drawings never share an id. */
export function Patterns({ prefix }: { prefix: string }) {
  return (
    <defs>
      <pattern id={`${prefix}-hatch-ink`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="var(--paper-2)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="1.3" />
      </pattern>
      <pattern id={`${prefix}-hatch-blue`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="var(--paper-2)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--blue)" strokeWidth="1.3" />
      </pattern>
    </defs>
  );
}

/** Engineering callouts: a dot on the outer boundary, a bent leader, a name. */
export function Callouts({ items }: { items: Callout[] }) {
  return (
    <g className={styles.callouts}>
      {items.map((c) => (
        <g key={c.key} className={styles.callout}>
          <path className={styles.lead} d={c.d} fill="none" stroke="var(--rule-2)" strokeWidth="1" />
          <circle className={styles.dot} cx={c.dotX} cy={c.dotY} r="2" fill="var(--rule-2)" />
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
