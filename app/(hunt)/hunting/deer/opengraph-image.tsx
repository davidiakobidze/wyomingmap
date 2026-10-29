import { DEER_AREAS, DEER_REGIONS, DEER_YEAR } from "@/lib/deer";
import { shareCard } from "@/lib/og";

export const alt = "Every Wyoming deer hunt area and nonresident region on one map, with the points that drew";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return shareCard({
    kicker: "Wyoming deer",
    name: "Every deer hunt area",
    stat: {
      big: String(DEER_AREAS.length),
      label: `hunt areas and ${DEER_REGIONS.length} nonresident regions, with ${DEER_YEAR} seasons and the points that drew.`,
    },
    geoms: DEER_AREAS.map((a) => a.geometry),
    locate: false,
    year: DEER_YEAR,
  });
}
