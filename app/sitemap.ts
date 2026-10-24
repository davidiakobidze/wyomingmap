import type { MetadataRoute } from "next";
import { DEER_AREAS, DEER_REGIONS, deerPath, regionPath } from "@/lib/deer";
import { ELK_AREAS, elkPath } from "@/lib/elk";
import { LANDING_PAGES } from "@/lib/pages";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...LANDING_PAGES.map((p) => ({
      url: `${SITE_URL}/${p.slug}`,
      changeFrequency: (p.slug === "wildfires" ? "hourly" : "weekly") as "hourly" | "weekly",
      priority: 0.8,
    })),
    { url: `${SITE_URL}/hunting/elk`, changeFrequency: "monthly", priority: 0.8 },
    ...ELK_AREAS.map((a) => ({
      url: `${SITE_URL}${elkPath(a)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/hunting/deer`, changeFrequency: "monthly", priority: 0.8 },
    ...DEER_REGIONS.map((r) => ({
      url: `${SITE_URL}${regionPath(r.region)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...DEER_AREAS.map((a) => ({
      url: `${SITE_URL}${deerPath(a)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/feature-your-business`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
