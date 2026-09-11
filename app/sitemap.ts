import type { MetadataRoute } from "next";
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
    { url: `${SITE_URL}/feature-your-business`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
