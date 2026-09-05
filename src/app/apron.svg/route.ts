import { apronSvg } from "@/components/home/apron";
import { apronGroups } from "@/components/home/derive";

/**
 * The apron chart as its own static asset. Serving it here rather than
 * server-rendering it inline on the home page means the 1,306-anchor SVG
 * string never has to travel a second time inside the React hydration
 * payload: the browser fetches it once, as a plain file, and caches it like
 * any other static asset.
 */
export const dynamic = "force-static";

export async function GET() {
  const { svg } = apronSvg(apronGroups(), "apron-title", "apron-desc");
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
