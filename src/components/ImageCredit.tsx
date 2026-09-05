import type { AircraftImage } from "@/lib/types";

export function ImageCredit({ image, className = "" }: { image: AircraftImage; className?: string }) {
  return (
    <div className={`mono text-[11px] leading-relaxed text-fg-dim ${className}`}>
      <a href={image.pageUrl} target="_blank" rel="noreferrer" className="hover:text-fg-muted">
        Photo
      </a>
      {image.author ? <> © {image.author}</> : null}
      {image.license ? (
        <>
          {" · "}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="hover:text-fg-muted">
              {image.license}
            </a>
          ) : (
            image.license
          )}
        </>
      ) : null}
      {" · via Wikimedia Commons"}
      {image.tier !== "exact" ? (
        <span className="text-accent">
          {" · representative: "}
          {image.tier === "operator-type" ? `same type and operator (${image.ofReg})` : `same type (${image.ofReg})`}
        </span>
      ) : null}
    </div>
  );
}
