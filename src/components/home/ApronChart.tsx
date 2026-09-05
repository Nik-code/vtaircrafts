import { Streamlines } from "@/components/ui/Streamlines";
import { GLYPH_PATHS } from "./glyphs";
import { APRON_FILL, apronSvg, type ApronGroup } from "./apron";
import type { Wing } from "@/lib/types";

const LEGEND: Array<{ wing: Wing; label: string }> = [
  { wing: "FW", label: "Fixed wing" },
  { wing: "RW", label: "Rotary" },
  { wing: "B", label: "Balloon" },
];

/**
 * The apron: every aircraft on the lists drawn once, parked in blocks by
 * operator. Rendered on the server as a single SVG so each glyph is a real
 * link, and painted from two layers so fill costs nothing per aircraft.
 */
export function ApronChart({ groups }: { groups: ApronGroup[] }) {
  const { svg } = apronSvg(groups, "apron-title", "apron-desc");
  const total = groups.reduce((n, g) => n + g.aircraft.length, 0);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-paper/25 pb-2">
        <span className="label">Apron chart · one glyph per aircraft</span>
        <span className="mono text-[11px] text-paper/70">
          {total.toLocaleString("en-IN")} parked · {groups.length} operators
        </span>
      </div>

      <a
        href="#sheet-02"
        className="sr-only focus:not-sr-only focus:mt-3 focus:inline-block focus:bg-paper focus:px-3 focus:py-1.5 focus:text-[11px] focus:tracking-[0.14em] focus:text-ink focus:uppercase"
      >
        Skip the apron chart
      </a>

      <div className="relative mt-4 min-w-0 flex-1 overflow-x-auto">
        <div className="relative min-w-[620px]">
          <Streamlines className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]" airfoil={false} />
          <div
            className="mono relative [&_a]:transition-[fill] [&_a]:duration-150 [&_a:hover]:fill-signal"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-paper/25 pt-3">
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
    </div>
  );
}
