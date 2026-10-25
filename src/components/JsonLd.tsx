const ORIGIN = "https://vtaircrafts.in";

/** schema.org structured data for search engines. */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** A BreadcrumbList from [name, path] pairs, home first. */
export function breadcrumbs(items: Array<[string, string]>): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["VT Aircrafts", "/"] as [string, string], ...items].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${ORIGIN}${path === "/" ? "" : path}`,
    })),
  };
}
