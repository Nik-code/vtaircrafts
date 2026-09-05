"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { fmtInt } from "@/lib/format";
import type { Operator, Meta } from "@/lib/types";
import { Callout } from "./Callout";
import { ButtonLink } from "@/components/ui/Button";

interface OperatorShare {
  id: string;
  name: string;
  category: "scheduled" | "non-scheduled" | "mixed";
  count: number;
  percentage: number;
  blades: number;
  startBlade: number;
  endBlade: number;
  color: string;
  lightColor: string;
  glow: string;
  isOthers?: boolean;
  operatorCount?: number;
}

// Curated aeronautical colors for operators across Fixed Wing and Rotary Wing
const PALETTE: Record<string, { color: string; lightColor: string; glow: string }> = {
  // Fixed wing
  indigo: { color: "#1d4ed8", lightColor: "#3b82f6", glow: "rgba(59, 130, 246, 0.45)" },
  "air-india": { color: "#b91c1c", lightColor: "#ef4444", glow: "rgba(239, 68, 68, 0.45)" },
  "air-india-express": { color: "#c2410c", lightColor: "#f97316", glow: "rgba(249, 115, 22, 0.45)" },
  spicejet: { color: "#be123c", lightColor: "#f43f5e", glow: "rgba(244, 63, 94, 0.45)" },
  "akasa-air": { color: "#b45309", lightColor: "#f59e0b", glow: "rgba(245, 158, 11, 0.45)" },
  "alliance-air": { color: "#4338ca", lightColor: "#6366f1", glow: "rgba(99, 102, 241, 0.45)" },
  "vsr-ventures": { color: "#6d28d9", lightColor: "#8b5cf6", glow: "rgba(139, 92, 246, 0.45)" },
  "reliance-commercial-dealers": { color: "#92400e", lightColor: "#d97706", glow: "rgba(217, 119, 6, 0.45)" },
  "star-air": { color: "#2563eb", lightColor: "#60a5fa", glow: "rgba(96, 165, 250, 0.45)" },
  "karnavati-aviation": { color: "#a16207", lightColor: "#eab308", glow: "rgba(234, 179, 8, 0.45)" },
  "air-charters-services": { color: "#7e22ce", lightColor: "#a855f7", glow: "rgba(168, 85, 247, 0.45)" },
  "indo-pacific-aviation": { color: "#0e7490", lightColor: "#06b6d4", glow: "rgba(6, 182, 212, 0.45)" },

  // Rotary wing / Helicopters
  "pawan-hans": { color: "#0f766e", lightColor: "#14b8a6", glow: "rgba(20, 184, 166, 0.45)" },
  "global-vectra-helicorp": { color: "#0369a1", lightColor: "#0ea5e9", glow: "rgba(14, 165, 233, 0.45)" },
  "heligo-charters": { color: "#047857", lightColor: "#10b981", glow: "rgba(16, 185, 129, 0.45)" },
  "thumby-aviation": { color: "#15803d", lightColor: "#22c55e", glow: "rgba(34, 197, 94, 0.45)" },
  "chipsan-aviation": { color: "#86198f", lightColor: "#c026d3", glow: "rgba(192, 38, 211, 0.45)" },
  "deccan-charters": { color: "#ca8a04", lightColor: "#facc15", glow: "rgba(250, 204, 21, 0.45)" },
  "jet-serve-aviation": { color: "#a21caf", lightColor: "#d946ef", glow: "rgba(217, 70, 239, 0.45)" },
  "heritage-aviation": { color: "#0284c7", lightColor: "#38bdf8", glow: "rgba(56, 189, 248, 0.45)" },
  "himalayan-heli-services": { color: "#475569", lightColor: "#94a3b8", glow: "rgba(148, 163, 184, 0.45)" },

  others: { color: "#475569", lightColor: "#64748b", glow: "rgba(100, 116, 139, 0.35)" },
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  // Round to 2 decimal places to prevent SSR hydration precision mismatch
  const x = Math.round((cx + r * Math.cos(rad)) * 100) / 100;
  const y = Math.round((cy + r * Math.sin(rad)) * 100) / 100;
  return [x, y];
}

/** Generate a single aerodynamic curved turbofan blade path */
function curvedBladePath(
  cx: number,
  cy: number,
  rin: number,
  rout: number,
  angleDeg: number,
  chordDeg = 2.4,
  sweepDeg = 11,
): string {
  const rad = (angleDeg * Math.PI) / 180;
  const chordRad = (chordDeg * Math.PI) / 180;
  const sweepRad = (sweepDeg * Math.PI) / 180;

  const rmid = (rin + rout) * 0.52;
  const a0 = rad;
  const a0Mid = rad + sweepRad * 0.72;
  const a0Tip = rad + sweepRad;

  const a1 = rad + chordRad;
  const a1Mid = rad + chordRad + sweepRad * 0.72;
  const a1Tip = rad + chordRad + sweepRad;

  const p0 = [cx + rin * Math.cos(a0), cy + rin * Math.sin(a0)];
  const p0Mid = [cx + rmid * Math.cos(a0Mid), cy + rmid * Math.sin(a0Mid)];
  const p0Tip = [cx + rout * Math.cos(a0Tip), cy + rout * Math.sin(a0Tip)];
  const p1Tip = [cx + rout * Math.cos(a1Tip), cy + rout * Math.sin(a1Tip)];
  const p1Mid = [cx + rmid * Math.cos(a1Mid), cy + rmid * Math.sin(a1Mid)];
  const p1 = [cx + rin * Math.cos(a1), cy + rin * Math.sin(a1)];

  return [
    `M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`,
    `Q ${p0Mid[0].toFixed(2)} ${p0Mid[1].toFixed(2)} ${p0Tip[0].toFixed(2)} ${p0Tip[1].toFixed(2)}`,
    `L ${p1Tip[0].toFixed(2)} ${p1Tip[1].toFixed(2)}`,
    `Q ${p1Mid[0].toFixed(2)} ${p1Mid[0].toFixed(2)} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Generate a straight aerodynamic helicopter rotor blade sector */
function rotorBladePath(
  cx: number,
  cy: number,
  rin: number,
  rout: number,
  angleDeg: number,
  chordDeg = 2.5,
): string {
  const [p0x, p0y] = polarToCartesian(cx, cy, rin, angleDeg);
  const [p1x, p1y] = polarToCartesian(cx, cy, rout, angleDeg);
  const [p2x, p2y] = polarToCartesian(cx, cy, rout, angleDeg + chordDeg);
  const [p3x, p3y] = polarToCartesian(cx, cy, rin, angleDeg + chordDeg * 0.85);

  return `M ${p0x.toFixed(2)} ${p0y.toFixed(2)} L ${p1x.toFixed(2)} ${p1y.toFixed(2)} L ${p2x.toFixed(2)} ${p2y.toFixed(2)} L ${p3x.toFixed(2)} ${p3y.toFixed(2)} Z`;
}

/** Tapering Archimedean spiral for the spinner nose cone */
function spinnerSpiral(cx: number, cy: number, r0: number, r1: number, revolutions = 1.35): string {
  const steps = 44;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = r0 + (r1 - r0) * Math.pow(t, 0.88);
    const angle = t * revolutions * 2 * Math.PI - Math.PI / 2;
    const x = Math.round((cx + r * Math.cos(angle)) * 100) / 100;
    const y = Math.round((cy + r * Math.sin(angle)) * 100) / 100;
    pts.push([x, y]);
  }
  return "M " + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L ");
}

/** Annular arc for outer rim highlight */
function annularArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const span = Math.min(359.99, endAngle - startAngle);
  const effectiveEnd = startAngle + span;
  const [x0, y0] = polarToCartesian(cx, cy, r, startAngle);
  const [x1, y1] = polarToCartesian(cx, cy, r, effectiveEnd);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function OperatorEngineChart({
  operators,
  total,
  counts,
}: {
  operators: Operator[];
  total: number;
  counts?: Meta["counts"];
}) {
  const [fwHoveredId, setFwHoveredId] = useState<string | null>(null);
  const [rwHoveredId, setRwHoveredId] = useState<string | null>(null);

  // Totals per wing category
  const fwTotal = counts?.fixedWing ?? operators.reduce((s, o) => s + (o.wings.FW || 0), 0);
  const rwTotal = counts?.rotary ?? operators.reduce((s, o) => s + (o.wings.RW || 0), 0);

  // 1. FIXED WING DATA (100 turbofan fan blades)
  const fwData = useMemo(() => {
    const fwOps = operators
      .filter((o) => o.wings.FW > 0)
      .map((o) => ({ ...o, categoryCount: o.wings.FW }))
      .sort((a, b) => b.categoryCount - a.categoryCount);

    const topCount = 9;
    const top = fwOps.slice(0, topCount);
    const topSum = top.reduce((s, o) => s + o.categoryCount, 0);
    const othersSum = fwTotal - topSum;
    const othersCount = fwOps.length - top.length;

    let allocatedBlades = 0;
    let currBladeIdx = 0;
    const list: OperatorShare[] = [];

    for (const o of top) {
      const pct = (o.categoryCount / fwTotal) * 100;
      const bCount = Math.max(1, Math.round(pct));
      allocatedBlades += bCount;

      const palette = PALETTE[o.id] ?? {
        color: "#1e293b",
        lightColor: "#475569",
        glow: "rgba(100, 116, 139, 0.35)",
      };

      list.push({
        id: o.id,
        name: o.name,
        category: o.category,
        count: o.categoryCount,
        percentage: pct,
        blades: bCount,
        startBlade: currBladeIdx,
        endBlade: currBladeIdx + bCount - 1,
        color: palette.color,
        lightColor: palette.lightColor,
        glow: palette.glow,
      });
      currBladeIdx += bCount;
    }

    const othersBlades = Math.max(1, 100 - allocatedBlades);
    list.push({
      id: "others-fw",
      name: "Other FW operators",
      category: "mixed",
      count: othersSum,
      percentage: (othersSum / fwTotal) * 100,
      blades: othersBlades,
      startBlade: currBladeIdx,
      endBlade: currBladeIdx + othersBlades - 1,
      color: PALETTE.others.color,
      lightColor: PALETTE.others.lightColor,
      glow: PALETTE.others.glow,
      isOthers: true,
      operatorCount: othersCount,
    });

    const blades: Array<{ index: number; angle: number; opId: string; op: OperatorShare }> = [];
    for (const op of list) {
      for (let bi = op.startBlade; bi <= op.endBlade; bi++) {
        const angle = -90 + bi * 3.6;
        blades.push({ index: bi, angle, opId: op.id, op });
      }
    }

    return {
      operators: list,
      allCount: fwOps.length,
      blades,
    };
  }, [operators, fwTotal]);

  // 2. ROTARY WING / HELICOPTER DATA (100 rotor blade sectors)
  const rwData = useMemo(() => {
    const rwOps = operators
      .filter((o) => o.wings.RW > 0)
      .map((o) => ({ ...o, categoryCount: o.wings.RW }))
      .sort((a, b) => b.categoryCount - a.categoryCount);

    const topCount = 6;
    const top = rwOps.slice(0, topCount);
    const topSum = top.reduce((s, o) => s + o.categoryCount, 0);
    const othersSum = rwTotal - topSum;
    const othersCount = rwOps.length - top.length;

    let allocatedBlades = 0;
    let currBladeIdx = 0;
    const list: OperatorShare[] = [];

    for (const o of top) {
      const pct = (o.categoryCount / rwTotal) * 100;
      const bCount = Math.max(1, Math.round(pct));
      allocatedBlades += bCount;

      const palette = PALETTE[o.id] ?? {
        color: "#0f766e",
        lightColor: "#14b8a6",
        glow: "rgba(20, 184, 166, 0.45)",
      };

      list.push({
        id: o.id,
        name: o.name,
        category: o.category,
        count: o.categoryCount,
        percentage: pct,
        blades: bCount,
        startBlade: currBladeIdx,
        endBlade: currBladeIdx + bCount - 1,
        color: palette.color,
        lightColor: palette.lightColor,
        glow: palette.glow,
      });
      currBladeIdx += bCount;
    }

    const othersBlades = Math.max(1, 100 - allocatedBlades);
    list.push({
      id: "others-rw",
      name: "Other helicopter charters",
      category: "non-scheduled",
      count: othersSum,
      percentage: (othersSum / rwTotal) * 100,
      blades: othersBlades,
      startBlade: currBladeIdx,
      endBlade: currBladeIdx + othersBlades - 1,
      color: PALETTE.others.color,
      lightColor: PALETTE.others.lightColor,
      glow: PALETTE.others.glow,
      isOthers: true,
      operatorCount: othersCount,
    });

    const blades: Array<{ index: number; angle: number; opId: string; op: OperatorShare }> = [];
    for (const op of list) {
      for (let bi = op.startBlade; bi <= op.endBlade; bi++) {
        const angle = -90 + bi * 3.6;
        blades.push({ index: bi, angle, opId: op.id, op });
      }
    }

    return {
      operators: list,
      allCount: rwOps.length,
      blades,
    };
  }, [operators, rwTotal]);

  // Active hover lookups
  const activeFwOp = fwHoveredId ? fwData.operators.find((s) => s.id === fwHoveredId) : null;
  const activeRwOp = rwHoveredId ? rwData.operators.find((s) => s.id === rwHoveredId) : null;

  // Geometry configuration (Unified 480x480 coordinate space)
  const CX = 240;
  const CY = 240;
  const R_COWL = 222;
  const R_RIM = 210;
  const R_OUT = 194;
  const R_IN = 78;
  const R_HUB = 74;
  const R_CORE = 60;

  const CARDINALS = [
    { angle: -90, label: "000°" },
    { angle: 0, label: "090°" },
    { angle: 90, label: "180°" },
    { angle: 180, label: "270°" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Telemetry Callout */}
      <Callout>
        Fleet breakdown by aerodynamic lift principle: {fmtInt(fwTotal)} fixed-wing aeroplanes ({((fwTotal / total) * 100).toFixed(1)}%) across {fwData.allCount} operators · {fmtInt(rwTotal)} rotary-wing helicopters ({((rwTotal / total) * 100).toFixed(1)}%) across {rwData.allCount} charter & offshore operators.
      </Callout>

      {/* 2 Visualisations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* ========================================================================= */}
        {/* 1. FIXED WING AIRCRAFT: TURBOFAN JET ENGINE (100 BLADES)                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between rounded-xs border border-rule bg-paper-2/40 p-5 sm:p-6">
          <div>
            {/* Header Plate */}
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="mono rounded-xs bg-blue px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                    FW
                  </span>
                  <h3 className="stencil text-lg font-semibold tracking-wide text-ink">
                    Fixed Wing Fleet
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">
                  Turbofan & turboprop transport · {fwData.allCount} operators
                </p>
              </div>
              <div className="text-right">
                <span className="display-num text-2xl font-bold text-ink">
                  {fmtInt(fwTotal)}
                </span>
                <span className="mono block text-[11px] text-ink-3">
                  {((fwTotal / total) * 100).toFixed(1)}% of national fleet
                </span>
              </div>
            </div>

            {/* Turbofan Schematic */}
            <div className="relative mx-auto my-5 aspect-square w-full max-w-[390px]">
              <svg
                viewBox="0 0 480 480"
                className="h-full w-full select-none overflow-visible drop-shadow-sm"
                aria-label="Fixed Wing Jet Engine 100-Blade Turbofan Chart"
              >
                <defs>
                  <radialGradient id="fw-nacelle" cx="50%" cy="50%" r="50%">
                    <stop offset="78%" stopColor="#1e293b" />
                    <stop offset="88%" stopColor="#334155" />
                    <stop offset="93%" stopColor="#475569" />
                    <stop offset="96%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </radialGradient>
                  <radialGradient id="fw-spinner" cx="42%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="45%" stopColor="#1e293b" />
                    <stop offset="85%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </radialGradient>
                  <radialGradient id="fw-hud" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity="0.94" />
                    <stop offset="75%" stopColor="#020617" stopOpacity="0.97" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="1" />
                  </radialGradient>
                  <linearGradient id="fw-blade-gloss" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                    <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
                  </linearGradient>
                </defs>

                {/* Outer Nacelle & Casing */}
                <circle cx={CX} cy={CY} r={R_COWL} fill="url(#fw-nacelle)" stroke="#0b192c" strokeWidth="2.5" />
                <circle cx={CX} cy={CY} r={R_RIM + 4} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3 5" opacity="0.65" />
                <circle cx={CX} cy={CY} r={R_RIM} fill="#09121f" stroke="#334155" strokeWidth="2" />

                {/* Rivets */}
                {Array.from({ length: 32 }).map((_, i) => {
                  const angle = (i / 32) * 360;
                  const [bx, by] = polarToCartesian(CX, CY, R_RIM + 6, angle);
                  return <circle key={`fw-bolt-${i}`} cx={bx} cy={by} r={1.2} fill="#94a3b8" opacity="0.6" />;
                })}

                {/* Radial degree ticks */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const deg = (i / 24) * 360;
                  const [t1x, t1y] = polarToCartesian(CX, CY, R_RIM - 1, deg);
                  const [t2x, t2y] = polarToCartesian(CX, CY, R_RIM - 5, deg);
                  return <line key={`fw-tick-${deg}`} x1={t1x} y1={t1y} x2={t2x} y2={t2y} stroke="#64748b" strokeWidth="1" />;
                })}

                {/* Cardinal Angle Labels */}
                {CARDINALS.map(({ angle, label }) => {
                  const [lx, ly] = polarToCartesian(CX, CY, R_COWL - 13, angle);
                  return (
                    <text
                      key={`fw-card-${label}`}
                      x={lx}
                      y={ly}
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="select-none font-semibold tracking-wider opacity-75"
                    >
                      {label}
                    </text>
                  );
                })}

                {/* 100 Turbofan Blades */}
                <g id="fw-blades">
                  {fwData.blades.map((b) => {
                    const isHovered = fwHoveredId === b.opId;
                    const isAnyHovered = fwHoveredId !== null;
                    const bPath = curvedBladePath(CX, CY, R_IN + 1, R_OUT - 1, b.angle, 2.3, 11);
                    const bladeFill = isHovered ? b.op.lightColor : b.op.color;
                    const opacity = isHovered ? 1.0 : isAnyHovered ? 0.26 : 0.88;

                    return (
                      <g
                        key={`fw-b-${b.index}`}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setFwHoveredId(b.opId)}
                        onMouseLeave={() => setFwHoveredId(null)}
                      >
                        <path
                          d={bPath}
                          fill={bladeFill}
                          opacity={opacity}
                          stroke={isHovered ? "#ffffff" : "#0a111e"}
                          strokeWidth={isHovered ? 1.0 : 0.4}
                          style={{
                            filter: isHovered ? `drop-shadow(0 0 6px ${b.op.glow})` : "none",
                          }}
                        />
                        <path d={bPath} fill="url(#fw-blade-gloss)" opacity={isHovered ? 0.75 : opacity * 0.45} className="pointer-events-none" />
                      </g>
                    );
                  })}
                </g>

                {/* Rim Highlight Arc */}
                {activeFwOp && (
                  <path
                    d={annularArc(CX, CY, R_OUT + 2, -90 + activeFwOp.startBlade * 3.6, -90 + (activeFwOp.endBlade + 1) * 3.6)}
                    fill="none"
                    stroke={activeFwOp.lightColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="pointer-events-none"
                    style={{ filter: `drop-shadow(0 0 8px ${activeFwOp.glow})` }}
                  />
                )}

                {/* Spinner Cone & Spiral */}
                <circle cx={CX} cy={CY} r={R_HUB} fill="url(#fw-spinner)" stroke="#475569" strokeWidth="2" />
                <path
                  d={spinnerSpiral(CX, CY, 8, R_CORE - 4, 1.35)}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  opacity="0.92"
                  className="pointer-events-none"
                />

                {/* Center Telemetry HUD Disc */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_CORE}
                  fill="url(#fw-hud)"
                  stroke={activeFwOp ? activeFwOp.lightColor : "#334155"}
                  strokeWidth={activeFwOp ? 2 : 1.5}
                  className="transition-colors duration-200"
                  style={{ filter: activeFwOp ? `drop-shadow(0 0 10px ${activeFwOp.glow})` : "none" }}
                />

                {/* Telemetry Text */}
                {activeFwOp ? (
                  <g className="pointer-events-none text-center">
                    <text x={CX} y={CY - 19} fill={activeFwOp.lightColor} fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600" textAnchor="middle" className="stencil uppercase">
                      {activeFwOp.name.length > 14 ? activeFwOp.name.slice(0, 13) + "…" : activeFwOp.name}
                    </text>
                    <text x={CX} y={CY + 3} fill="#f3f0e8" fontSize="23" fontFamily="var(--font-display)" fontWeight="700" textAnchor="middle" dominantBaseline="middle" className="display-num">
                      {fmtInt(activeFwOp.count)}
                    </text>
                    <text x={CX} y={CY + 21} fill="#94a3b8" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500" textAnchor="middle">
                      {activeFwOp.blades} BLADES · {activeFwOp.percentage.toFixed(1)}%
                    </text>
                    <text x={CX} y={CY + 33} fill="#cbd5e1" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.85">
                      {activeFwOp.category.toUpperCase()}
                    </text>
                  </g>
                ) : (
                  <g className="pointer-events-none text-center">
                    <text x={CX} y={CY - 17} fill="#94a3b8" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.08em" textAnchor="middle" className="stencil opacity-80">
                      FIXED WING
                    </text>
                    <text x={CX} y={CY + 3} fill="#f3f0e8" fontSize="25" fontFamily="var(--font-display)" fontWeight="700" textAnchor="middle" dominantBaseline="middle" className="display-num">
                      {fmtInt(fwTotal)}
                    </text>
                    <text x={CX} y={CY + 21} fill="#94a3b8" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="500" textAnchor="middle">
                      100 FAN BLADES
                    </text>
                    <text x={CX} y={CY + 33} fill="#cbd5e1" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.75">
                      {fwData.allCount} OPERATORS
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Interactive Mini-Roster */}
            <div className="mt-2 border-t border-rule pt-3">
              <span className="mono block text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                Leading Fixed Wing Carriers ({fwData.allCount})
              </span>
              <ul className="mt-1 divide-y divide-rule/60 text-xs">
                {fwData.operators.map((op, idx) => {
                  const isHovered = fwHoveredId === op.id;
                  return (
                    <li
                      key={op.id}
                      onMouseEnter={() => setFwHoveredId(op.id)}
                      onMouseLeave={() => setFwHoveredId(null)}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 transition-colors ${
                        isHovered ? "bg-paper-3" : "hover:bg-paper-2"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="mono w-4 text-[10px] text-ink-3">
                          {op.isOthers ? "—" : idx + 1}
                        </span>
                        <span
                          className="h-3.5 w-1.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: op.color }}
                        />
                        {op.isOthers ? (
                          <span className="truncate font-medium text-ink">
                            {op.name}{" "}
                            <span className="text-[10px] text-ink-3">
                              ({op.operatorCount} operators)
                            </span>
                          </span>
                        ) : (
                          <Link
                            href={`/operators/${op.id}`}
                            className="truncate font-medium text-ink transition-colors hover:text-signal"
                          >
                            {op.name}
                          </Link>
                        )}
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2 text-right">
                        <span className="display-num text-sm font-bold text-ink">
                          {fmtInt(op.count)}
                        </span>
                        <span className="mono text-[10px] text-ink-3">
                          ({op.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-rule pt-3 text-xs text-ink-3">
            <span className="mono">12 scheduled · 95 non-scheduled</span>
            <ButtonLink href="/operators">All {fwData.allCount} FW operators</ButtonLink>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. ROTARY WING / HELICOPTERS: ROTOR BLADES & SWASHPLATE (100 BLADES)      */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between rounded-xs border border-rule bg-paper-2/40 p-5 sm:p-6">
          <div>
            {/* Header Plate */}
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="mono rounded-xs bg-mint px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                    RW
                  </span>
                  <h3 className="stencil text-lg font-semibold tracking-wide text-ink">
                    Rotary Wing Fleet
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">
                  Helicopters, offshore & charters · {rwData.allCount} operators
                </p>
              </div>
              <div className="text-right">
                <span className="display-num text-2xl font-bold text-ink">
                  {fmtInt(rwTotal)}
                </span>
                <span className="mono block text-[11px] text-ink-3">
                  {((rwTotal / total) * 100).toFixed(1)}% of national fleet
                </span>
              </div>
            </div>

            {/* Helicopter Rotor Schematic */}
            <div className="relative mx-auto my-5 aspect-square w-full max-w-[390px]">
              <svg
                viewBox="0 0 480 480"
                className="h-full w-full select-none overflow-visible drop-shadow-sm"
                aria-label="Rotary Wing Helicopter Main Rotor Blades Chart"
              >
                <defs>
                  <radialGradient id="rw-tip-plane" cx="50%" cy="50%" r="50%">
                    <stop offset="78%" stopColor="#0f172a" />
                    <stop offset="90%" stopColor="#1e293b" />
                    <stop offset="96%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </radialGradient>
                  <radialGradient id="rw-swashplate" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="50%" stopColor="#1e293b" />
                    <stop offset="90%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </radialGradient>
                  <radialGradient id="rw-hud" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#042f2e" stopOpacity="0.94" />
                    <stop offset="75%" stopColor="#021a1a" stopOpacity="0.97" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="1" />
                  </radialGradient>
                  <linearGradient id="rw-blade-gloss" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
                  </linearGradient>
                </defs>

                {/* Outer Rotor Tip-Path Plane Hazard Ring */}
                <circle cx={CX} cy={CY} r={R_COWL} fill="url(#rw-tip-plane)" stroke="#042f2e" strokeWidth="2" />
                <circle cx={CX} cy={CY} r={R_RIM + 4} fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.75" />
                <circle cx={CX} cy={CY} r={R_RIM} fill="#031518" stroke="#134e4a" strokeWidth="1.8" />

                {/* Direction of Rotation Points */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * 360;
                  const [t1x, t1y] = polarToCartesian(CX, CY, R_RIM + 6, angle);
                  return <circle key={`rw-point-${i}`} cx={t1x} cy={t1y} r={1.5} fill="#2dd4bf" opacity="0.6" />;
                })}

                {/* Cardinal Compass Labels */}
                {CARDINALS.map(({ angle, label }) => {
                  const [lx, ly] = polarToCartesian(CX, CY, R_COWL - 13, angle);
                  return (
                    <text
                      key={`rw-card-${label}`}
                      x={lx}
                      y={ly}
                      fill="#5eead4"
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="select-none font-semibold tracking-wider opacity-75"
                    >
                      {label}
                    </text>
                  );
                })}

                {/* 100 Helicopter Rotor Blades */}
                <g id="rw-blades">
                  {rwData.blades.map((b) => {
                    const isHovered = rwHoveredId === b.opId;
                    const isAnyHovered = rwHoveredId !== null;
                    const bPath = rotorBladePath(CX, CY, R_IN + 1, R_OUT - 1, b.angle, 2.5);
                    const bladeFill = isHovered ? b.op.lightColor : b.op.color;
                    const opacity = isHovered ? 1.0 : isAnyHovered ? 0.26 : 0.88;

                    return (
                      <g
                        key={`rw-b-${b.index}`}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setRwHoveredId(b.opId)}
                        onMouseLeave={() => setRwHoveredId(null)}
                      >
                        <path
                          d={bPath}
                          fill={bladeFill}
                          opacity={opacity}
                          stroke={isHovered ? "#ffffff" : "#022c22"}
                          strokeWidth={isHovered ? 1.0 : 0.4}
                          style={{
                            filter: isHovered ? `drop-shadow(0 0 6px ${b.op.glow})` : "none",
                          }}
                        />
                        <path d={bPath} fill="url(#rw-blade-gloss)" opacity={isHovered ? 0.75 : opacity * 0.45} className="pointer-events-none" />
                      </g>
                    );
                  })}
                </g>

                {/* Rim Highlight Arc */}
                {activeRwOp && (
                  <path
                    d={annularArc(CX, CY, R_OUT + 2, -90 + activeRwOp.startBlade * 3.6, -90 + (activeRwOp.endBlade + 1) * 3.6)}
                    fill="none"
                    stroke={activeRwOp.lightColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="pointer-events-none"
                    style={{ filter: `drop-shadow(0 0 8px ${activeRwOp.glow})` }}
                  />
                )}

                {/* Swashplate Hub Ring */}
                <circle cx={CX} cy={CY} r={R_HUB} fill="url(#rw-swashplate)" stroke="#14b8a6" strokeWidth="1.5" />
                {/* 4 Rotor Pitch Control Pushrods / Links */}
                {[-45, 45, 135, 225].map((angle) => {
                  const [x1, y1] = polarToCartesian(CX, CY, R_CORE, angle);
                  const [x2, y2] = polarToCartesian(CX, CY, R_HUB - 2, angle);
                  return <line key={`pushrod-${angle}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2dd4bf" strokeWidth="2" opacity="0.85" />;
                })}

                {/* Center Telemetry HUD Disc */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R_CORE}
                  fill="url(#rw-hud)"
                  stroke={activeRwOp ? activeRwOp.lightColor : "#0f766e"}
                  strokeWidth={activeRwOp ? 2 : 1.5}
                  className="transition-colors duration-200"
                  style={{ filter: activeRwOp ? `drop-shadow(0 0 10px ${activeRwOp.glow})` : "none" }}
                />

                {/* Telemetry Text */}
                {activeRwOp ? (
                  <g className="pointer-events-none text-center">
                    <text x={CX} y={CY - 19} fill={activeRwOp.lightColor} fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="600" textAnchor="middle" className="stencil uppercase">
                      {activeRwOp.name.length > 14 ? activeRwOp.name.slice(0, 13) + "…" : activeRwOp.name}
                    </text>
                    <text x={CX} y={CY + 3} fill="#f3f0e8" fontSize="23" fontFamily="var(--font-display)" fontWeight="700" textAnchor="middle" dominantBaseline="middle" className="display-num">
                      {fmtInt(activeRwOp.count)}
                    </text>
                    <text x={CX} y={CY + 21} fill="#5eead4" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500" textAnchor="middle">
                      {activeRwOp.blades} BLADES · {activeRwOp.percentage.toFixed(1)}%
                    </text>
                    <text x={CX} y={CY + 33} fill="#a7f3d0" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.85">
                      HELICOPTER NSOP
                    </text>
                  </g>
                ) : (
                  <g className="pointer-events-none text-center">
                    <text x={CX} y={CY - 17} fill="#5eead4" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.08em" textAnchor="middle" className="stencil opacity-80">
                      ROTARY WING
                    </text>
                    <text x={CX} y={CY + 3} fill="#f3f0e8" fontSize="25" fontFamily="var(--font-display)" fontWeight="700" textAnchor="middle" dominantBaseline="middle" className="display-num">
                      {fmtInt(rwTotal)}
                    </text>
                    <text x={CX} y={CY + 21} fill="#5eead4" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="500" textAnchor="middle">
                      100 ROTOR BLADES
                    </text>
                    <text x={CX} y={CY + 33} fill="#a7f3d0" fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.75">
                      {rwData.allCount} OPERATORS
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Interactive Mini-Roster */}
            <div className="mt-2 border-t border-rule pt-3">
              <span className="mono block text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                Leading Helicopter Operators ({rwData.allCount})
              </span>
              <ul className="mt-1 divide-y divide-rule/60 text-xs">
                {rwData.operators.map((op, idx) => {
                  const isHovered = rwHoveredId === op.id;
                  return (
                    <li
                      key={op.id}
                      onMouseEnter={() => setRwHoveredId(op.id)}
                      onMouseLeave={() => setRwHoveredId(null)}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 transition-colors ${
                        isHovered ? "bg-paper-3" : "hover:bg-paper-2"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="mono w-4 text-[10px] text-ink-3">
                          {op.isOthers ? "—" : idx + 1}
                        </span>
                        <span
                          className="h-3.5 w-1.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: op.color }}
                        />
                        {op.isOthers ? (
                          <span className="truncate font-medium text-ink">
                            {op.name}{" "}
                            <span className="text-[10px] text-ink-3">
                              ({op.operatorCount} operators)
                            </span>
                          </span>
                        ) : (
                          <Link
                            href={`/operators/${op.id}`}
                            className="truncate font-medium text-ink transition-colors hover:text-signal"
                          >
                            {op.name}
                          </Link>
                        )}
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2 text-right">
                        <span className="display-num text-sm font-bold text-ink">
                          {fmtInt(op.count)}
                        </span>
                        <span className="mono text-[10px] text-ink-3">
                          ({op.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-rule pt-3 text-xs text-ink-3">
            <span className="mono">Offshore, VIP & charter NSOP</span>
            <ButtonLink href="/operators">All {rwData.allCount} RW operators</ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
