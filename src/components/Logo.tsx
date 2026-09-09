/**
 * The VT Aircrafts mark: a plan-view airframe inside a rounded plate, one
 * accent-coloured nose light. Fixed viewBox keeps it crisp at 1x and 2x.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 24" width="24" height="24" className={className} aria-hidden fill="none" stroke="currentColor">
      <rect x="1" y="1" width="28" height="22" rx="5" strokeWidth="1.6" />
      <path
        d="M15 3.5 L16 7 L26 12 L26 13.2 L16.5 14 L21 18.5 L21 19.5 L16 19.7 L15 21.5 L14 19.7 L9 19.5 L9 18.5 L13.5 14 L4 13.2 L4 12 L14 7 Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="15" cy="4.6" r="1.1" fill="var(--accent)" stroke="none" />
    </svg>
  );
}
