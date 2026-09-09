import type { AircraftImage, Wing } from "@/lib/types";
import { thumb } from "@/lib/format";
import { Silhouette } from "./Silhouette";

/**
 * An aircraft photograph in a rounded frame. When no photo exists a quiet
 * silhouette stands in. Credit is rendered separately (see PhotoCredit) so
 * the frame itself stays clean.
 */
export function Photo({
  image,
  wing,
  alt,
  width = 1280,
  aspect = "aspect-[3/2]",
  eager = false,
  className = "",
  rounded = "rounded-[var(--radius-md)]",
}: {
  image: AircraftImage | null;
  wing: Wing;
  alt: string;
  width?: number;
  aspect?: string;
  eager?: boolean;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-bg-3 ${rounded} ${aspect} ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb(image.src, width)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-fg-3">
          <Silhouette wing={wing} className="h-1/2 w-1/2" strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
}

/** One short line: photographer, licence, and whether the frame is a stand-in. */
export function PhotoCredit({ image, className = "" }: { image: AircraftImage; className?: string }) {
  return (
    <p className={`text-[13px] leading-relaxed text-fg-3 ${className}`}>
      {image.tier !== "exact" && (
        <span className="text-fg-2">
          Representative photo{image.ofReg ? ` of ${image.ofReg}` : ""}, same type
          {image.tier === "operator-type" ? " and operator" : ""}.{" "}
        </span>
      )}
      <a href={image.pageUrl} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-fg">
        Photo
      </a>
      {image.author ? ` by ${shortAuthor(image.author)}` : ""}
      {image.license ? (
        <>
          {", "}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-fg">
              {image.license}
            </a>
          ) : (
            image.license
          )}
        </>
      ) : null}
      {" via Wikimedia Commons."}
    </p>
  );
}

function shortAuthor(a: string) {
  const s = a.replace(/\s+from\s+.*$/i, "").replace(/\s*\(.*?\)\s*/g, " ").trim();
  return s.length > 32 ? `${s.slice(0, 31)}…` : s;
}
