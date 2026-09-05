"use client";

import { useEffect, useState } from "react";
import { Streamlines } from "@/components/ui/Streamlines";
import { fmtInt } from "@/lib/format";
import { GLYPH_PATHS } from "./glyphs";
import { APRON_FILL } from "./apron";
import type { Wing } from "@/lib/types";

const LEGEND: Array<{ wing: Wing; label: string }> = [
  { wing: "FW", label: "Fixed wing" },
  { wing: "RW", label: "Rotary" },
  { wing: "B", label: "Balloon" },
];

/** Module-scope so every mount of ApronChart on the page shares one fetch. */
let apronSvgPromise: Promise<string> | null = null;

function loadApronSvg(): Promise<string> {
  if (!apronSvgPromise) {
    apronSvgPromise = fetch("/apron.svg")
      .then((res) => {
        if (!res.ok) throw new Error(`apron.svg responded ${res.status}`);
        return res.text();
      })
      .catch((err) => {
        apronSvgPromise = null; // let a later mount retry instead of caching the failure
        throw err;
      });
  }
  return apronSvgPromise;
}

/**
 * The apron: every aircraft on the lists drawn once, parked in blocks by
 * operator. The chart itself lives at /apron.svg (see src/app/apron.svg/route.ts)
 * as a self-contained static SVG, so its anchors never travel through the
 * React tree or the hydration payload — this component only fetches it once,
 * fades it in, and drops the markup in.
 */
export function ApronChart({
  total,
  width,
  height,
}: {
  total: number;
  width: number;
  height: number;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    let cancelled = false;
    loadApronSvg().then(
      (markup) => {
        if (!cancelled) setSvg(markup);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!svg || reducedMotion) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [svg, reducedMotion]);

  return (
    <div className="flex min-w-0 flex-col">
      <a
        href="#sheet-02"
        className="sr-only focus:not-sr-only focus:mb-2 focus:inline-block focus:bg-paper focus:px-3 focus:py-1.5 focus:text-[11px] focus:tracking-[0.14em] focus:text-ink focus:uppercase"
      >
        Skip the apron chart
      </a>

      <div className="relative min-w-0 flex-1 overflow-x-auto">
        <div className="relative min-w-[680px]">
          <Streamlines className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]" airfoil={false} />
          {failed ? (
            <p className="mono py-10 text-center text-[13px] text-paper/70">Chart unavailable</p>
          ) : svg ? (
            <div
              className="relative"
              style={{
                opacity: reducedMotion || visible ? 1 : 0,
                transition: reducedMotion ? "none" : "opacity 400ms ease-out",
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="grid-paper w-full" style={{ aspectRatio: `${width} / ${height}` }} aria-hidden />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-paper/25 pt-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LEGEND.map((l) => (
            <span key={l.wing} className="label flex items-center gap-1.5">
              <svg viewBox="0 0 10 10" width="12" height="12" aria-hidden className="shrink-0">
                <path d={GLYPH_PATHS[l.wing]} fill={APRON_FILL.scheduled} />
              </svg>
              {l.label}
            </span>
          ))}
          <span className="label flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0" style={{ background: APRON_FILL.scheduled }} />
            Scheduled
          </span>
          <span className="label flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0" style={{ background: APRON_FILL.nonScheduled }} />
            Non-scheduled
          </span>
        </div>
        <span className="label text-paper/70">One glyph per aircraft · {fmtInt(total)} parked</span>
      </div>
    </div>
  );
}
