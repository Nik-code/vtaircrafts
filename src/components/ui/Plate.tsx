import Link from "next/link";
import type { AircraftImage, Wing } from "@/lib/types";
import { thumb } from "@/lib/format";
import { Silhouette } from "./Silhouette";

/**
 * Photo plate: a bordered, riveted frame with a figure caption and credit.
 * `fig` is a figure number like "04". When no image is available, a silhouette
 * placeholder is drawn on graph paper.
 */
export function Plate({
  image,
  wing,
  alt,
  fig,
  caption,
  width = 1280,
  aspect = "aspect-[3/2]",
  eager = false,
  className = "",
  hideCredit = false,
  href,
}: {
  image: AircraftImage | null;
  wing: Wing;
  alt: string;
  fig?: string;
  caption?: React.ReactNode;
  width?: number;
  aspect?: string;
  eager?: boolean;
  className?: string;
  hideCredit?: boolean;
  /** Links the image (not the caption, which carries its own credit anchor). Never wrap a Plate in <Link>. */
  href?: string;
}) {
  return (
    <figure className={`rivets border border-rule-2 bg-paper-2 ${className}`}>
      <span className="rivet-b" />
      <Wrap href={href} className={`m-[10px] block overflow-hidden border border-rule ${aspect}`}>
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
          <div className="grid-paper grid h-full w-full place-items-center text-ink-3">
            <Silhouette wing={wing} className="h-1/2 w-1/2" />
          </div>
        )}
      </Wrap>
      {(fig || caption || (image && !hideCredit)) && (
        <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-[10px] pb-2 pt-0">
          {fig && <span className="label">Fig. {fig}</span>}
          {caption && <span className="text-sm">{caption}</span>}
          {image && !hideCredit && <Credit image={image} />}
        </figcaption>
      )}
    </figure>
  );
}

function Wrap({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  if (href) return <Link href={href} className={className}>{children}</Link>;
  return <div className={className}>{children}</div>;
}

export function Credit({ image, className = "" }: { image: AircraftImage; className?: string }) {
  return (
    <span className={`mono ml-auto text-[10.5px] text-ink-3 ${className}`}>
      <a href={image.pageUrl} target="_blank" rel="noreferrer" className="hover:text-ink">
        Photo
      </a>
      {image.author ? ` ${shortAuthor(image.author)}` : ""}
      {image.license ? (
        <>
          {", "}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="hover:text-ink">{image.license}</a>
          ) : image.license}
        </>
      ) : null}
      {image.tier !== "exact" && (
        <span className="text-caution">{" · representative"}{image.ofReg ? ` (${image.ofReg})` : ""}</span>
      )}
    </span>
  );
}

function shortAuthor(a: string) {
  const s = a.replace(/\s+from\s+.*$/i, "").replace(/\s*\(.*?\)\s*/g, " ").trim();
  return s.length > 28 ? `${s.slice(0, 27)}…` : s;
}
