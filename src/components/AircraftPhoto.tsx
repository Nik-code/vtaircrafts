import type { AircraftImage, Wing } from "@/lib/types";
import { thumb } from "@/lib/format";

export function Silhouette({ wing, className = "" }: { wing: Wing; className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden>
      {wing === "RW" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M20 30 h20 M40 30 v-10 M40 20 l30 -8 M40 20 l-30 -8 M40 20 l0 -6" />
          <path d="M28 30 c0 -8 8 -12 20 -12 h32 c8 0 12 4 12 10 v2 c0 4 -3 6 -8 6 h-40 c-10 0 -16 -2 -16 -6 z" />
          <path d="M84 36 l16 -6 M100 30 l-4 -8 M40 40 v6 M74 40 v6 M34 46 h46" />
        </g>
      ) : wing === "B" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.6">
          <ellipse cx="60" cy="22" rx="20" ry="18" />
          <path d="M48 36 l6 16 M72 36 l-6 16 M54 52 h12 v5 h-12 z" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M8 32 h84 c8 0 14 -3 18 -6 l6 -4 l-6 -1 h-10" />
          <path d="M8 32 c-2 -6 2 -10 8 -10 h70 c6 0 10 2 10 5" />
          <path d="M50 26 l-18 -14 h10 l22 14 M52 34 l-16 14 h9 l19 -14 M84 26 l6 -12 h6 l-4 12" />
        </g>
      )}
    </svg>
  );
}

export function AircraftPhoto({
  image,
  wing,
  alt,
  width = 640,
  className = "",
  eager = false,
}: {
  image: AircraftImage | null;
  wing: Wing;
  alt: string;
  width?: number;
  className?: string;
  eager?: boolean;
}) {
  if (!image) {
    return (
      <div className={`dotgrid grid place-items-center bg-bg-elev text-fg-dim ${className}`}>
        <Silhouette wing={wing} className="h-1/3 w-1/3 opacity-60" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb(image.src, width)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}
