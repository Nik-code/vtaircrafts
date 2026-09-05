/**
 * The VT Aircrafts mark: a registration plate with a plan-view fixed-wing
 * silhouette and corner ticks, in the engineering-drawing spirit of the rest
 * of the sheet. Ink for the plate and airframe, one signal-orange rivet.
 * Fixed viewBox and integer-ish geometry keep it crisp at 1x and 2x.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 24"
      width="24"
      height="24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
    >
      {/* registration-plate rectangle */}
      <rect x="1" y="1" width="28" height="22" strokeWidth="1.4" />
      {/* corner ticks */}
      <path
        d="M1 5.5H3.5M1 18.5H3.5M29 5.5H26.5M29 18.5H26.5"
        strokeWidth="1"
        strokeLinecap="square"
      />
      {/* plan-view fixed-wing silhouette, symmetric about x=15 */}
      <path
        d="M15 3 L16 7 L26 12 L26 13.2 L16.5 14 L21 18.5 L21 19.5 L16 19.7 L15 21.5 L14 19.7 L9 19.5 L9 18.5 L13.5 14 L4 13.2 L4 12 L14 7 Z"
        fill="currentColor"
        stroke="none"
      />
      {/* signal nav light at the nose */}
      <circle cx="15" cy="4.3" r="1" fill="var(--signal)" stroke="none" />
    </svg>
  );
}
