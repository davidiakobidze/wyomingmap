import { ELK_AREAS, ELK_YEAR } from "@/lib/elk";
import { shareCard } from "@/lib/og";

export const alt = "Every Wyoming elk hunt area on one map, with the points nonresidents needed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return shareCard({
    kicker: "Wyoming elk",
    name: "Every elk hunt area",
    stat: { big: String(ELK_AREAS.length), label: `hunt areas, with ${ELK_YEAR} seasons, the points nonresidents needed and your own odds.` },
    geoms: ELK_AREAS.map((a) => a.geometry),
    locate: false,
    year: ELK_YEAR,
  });
}
