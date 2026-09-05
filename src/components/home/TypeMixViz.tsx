import { Silhouette } from "@/components/ui/Silhouette";
import { Dimension } from "@/components/ui/Dimension";
import { fmtInt } from "@/lib/format";
import type { Wing } from "@/lib/types";
import type { TypeRow } from "./derive";
import { layoutFlightLine } from "./typemix/layout";
import styles from "./typemix/typemix.module.css";

/** At most this many types get a silhouette on the flight line. */
const DRAWN = 12;

const WING_LABEL: Record<Wing, string> = { FW: "Fixed wing", RW: "Rotary", B: "Balloon" };

/** Tailwind colour-utility suffix for a type's wing, ink for fixed wing and mint
 * for rotary per DESIGN.md; the single largest type on the sheet gets signal. */
function tone(wing: Wing, highlight: boolean): "signal" | "mint" | "ink" {
  if (highlight) return "signal";
  if (wing === "RW") return "mint";
  return "ink";
}

export function TypeMixViz({ rows, total, wings }: { rows: TypeRow[]; total: number; wings: Record<Wing, number> }) {
  const drawn = rows.slice(0, Math.min(DRAWN, rows.length));
  if (drawn.length === 0) return null;

  const layout = layoutFlightLine(drawn, rows[0].name);
  const { items, vw, vh, baseline, apronBottom, centerlineY, standY, labelLineH, labelFontSize, countFontSize } = layout;
  const apronH = apronBottom - baseline;

  return (
    <>
      <Dimension>
        {fmtInt(rows.length)} types on the lists · {fmtInt(drawn.length)} drawn
      </Dimension>

      <div
        className="relative mt-8 w-full"
        style={{ aspectRatio: `${vw} / ${vh}` }}
        role="img"
        aria-label={`Flight line of the ${drawn.length} most common aircraft types, drawn largest fleet first, out of ${fmtInt(rows.length)} types across ${fmtInt(total)} aircraft on the DGCA lists. ${drawn
          .map((r) => `${r.name}: ${fmtInt(r.count)}`)
          .join(", ")}.`}
      >
        <svg viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {/* apron pavement */}
          <rect x={0} y={baseline} width={vw} height={apronH} className="fill-paper-3" />
          <line x1={0} y1={baseline} x2={vw} y2={baseline} className="stroke-rule-2" strokeWidth={1} />
          <line
            x1={0}
            y1={centerlineY}
            x2={vw}
            y2={centerlineY}
            className={`stroke-ink ${styles.centerline}`}
            strokeWidth={1.4}
            strokeOpacity={0.55}
          />

          {items.map((item) => {
            const t = tone(item.row.wing, item.highlight);
            const strokeCls = t === "signal" ? "stroke-signal" : t === "mint" ? "stroke-mint" : "stroke-ink";
            const fillCls = t === "signal" ? "fill-signal" : t === "mint" ? "fill-mint" : "fill-ink";
            const helipadR = Math.min(apronH / 2 - 4, item.w * 0.16);
            return (
              <g key={item.row.name}>
                {/* faint apron stand number under the aircraft */}
                <text
                  x={item.cx}
                  y={standY}
                  dy="0.32em"
                  textAnchor="middle"
                  className="fill-ink mono"
                  fillOpacity={0.4}
                  fontSize={9}
                >
                  {String(item.number).padStart(2, "0")}
                </text>

                {item.row.wing === "RW" && (
                  <g>
                    <circle cx={item.cx} cy={centerlineY} r={helipadR} className={`fill-paper ${strokeCls}`} strokeWidth={1} />
                    <text
                      x={item.cx}
                      y={centerlineY}
                      dy="0.32em"
                      textAnchor="middle"
                      className={`${fillCls} mono`}
                      fontSize={Math.max(6, helipadR * 0.9)}
                    >
                      H
                    </text>
                  </g>
                )}

                {/* leader line from the callout down to the airframe */}
                <line
                  x1={item.cx}
                  y1={item.leaderTopY}
                  x2={item.cx}
                  y2={item.y - 4}
                  className={strokeCls}
                  strokeWidth={1}
                  strokeOpacity={0.85}
                />
                <circle cx={item.cx} cy={item.y - 4} r={1.6} className={fillCls} />

                {/* callout: type name (1-2 lines, never truncated) + count */}
                {item.nameLines.map((line, i) => (
                  <text
                    key={i}
                    x={item.cx}
                    y={item.labelY + i * labelLineH}
                    textAnchor="middle"
                    className={`label ${fillCls}`}
                    fontSize={labelFontSize}
                  >
                    {line}
                  </text>
                ))}
                <text
                  x={item.cx}
                  y={item.countY}
                  textAnchor="middle"
                  className={`display-num ${fillCls}`}
                  fontSize={countFontSize}
                >
                  {fmtInt(item.row.count)}
                </text>
              </g>
            );
          })}
        </svg>

        {items.map((item) => {
          const t = tone(item.row.wing, item.highlight);
          const colorCls = t === "signal" ? "text-signal" : t === "mint" ? "text-mint" : "text-ink";
          // The largest type keeps a light signal tint even off fixed wing;
          // other fixed-wing silhouettes get a faint paper fill so they read
          // as solid planforms. Rotary/balloon stay hollow outlines.
          const fillCls = item.highlight ? styles.fillHighlight : item.row.wing === "FW" ? styles.fillFw : "";
          return (
            <div
              key={item.row.name}
              className="absolute"
              style={{
                left: `${(item.x / vw) * 100}%`,
                top: `${(item.y / vh) * 100}%`,
                width: `${(item.w / vw) * 100}%`,
                height: `${(item.h / vh) * 100}%`,
              }}
            >
              <Silhouette wing={item.row.wing} className={`h-full w-full ${colorCls} ${fillCls}`} strokeWidth={item.strokeWidth} />
            </div>
          );
        })}
      </div>

      <div className="mono mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12px] text-ink-3">
        {(["FW", "RW", "B"] as Wing[])
          .filter((w) => (wings[w] ?? 0) > 0)
          .map((w) => (
            <span key={w} className="inline-flex items-center gap-2">
              <Silhouette wing={w} className={`h-4 w-6 shrink-0 ${w === "RW" ? "text-mint" : "text-ink-2"}`} strokeWidth={1.3} />
              {fmtInt(wings[w] ?? 0)} {WING_LABEL[w].toLowerCase()}
            </span>
          ))}
      </div>
    </>
  );
}
