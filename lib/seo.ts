import { SITE_NAME, SITE_URL, WYOMING_BOUNDS } from "@/lib/site";

// schema.org shapes for the JSON-LD on each page; see components/JsonLd.tsx.

export const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  alternateName: ["wyomingmap.com", "Wyoming Hunting Map"],
  inLanguage: "en-US",
};

export function breadcrumbs(items: { href?: string; label: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((x, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: x.label,
      ...(x.href ? { item: `${SITE_URL}${x.href === "/" ? "" : x.href}` } : {}),
    })),
  };
}

const [[west, south], [east, north]] = WYOMING_BOUNDS;

// A species index as a dataset: what Google Dataset Search lists.
export function huntDataset(o: {
  path: string;
  name: string;
  description: string;
  year: number;
  sources: string[];
  geojson: string;
  measures: string[];
}) {
  return {
    "@type": "Dataset",
    name: o.name,
    description: o.description,
    url: `${SITE_URL}${o.path}`,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    isBasedOn: o.sources,
    creditText: "Wyoming Game and Fish Department draw reports and hunting season regulations",
    temporalCoverage: String(o.year),
    spatialCoverage: {
      "@type": "Place",
      name: "Wyoming",
      geo: { "@type": "GeoShape", box: `${south} ${west} ${north} ${east}` },
    },
    variableMeasured: o.measures,
    distribution: { "@type": "DataDownload", encodingFormat: "application/geo+json", contentUrl: `${SITE_URL}${o.geojson}` },
  };
}
