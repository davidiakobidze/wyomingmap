import { DEER_AREAS } from "@/lib/deer";
import { ELK_AREAS, ELK_YEAR } from "@/lib/elk";
import { shareCard } from "@/lib/og";

// The homepage card; the indexes and every area and region page have their own.
export const alt = "Every Wyoming elk hunt area, with the draw odds at your own preference points";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return shareCard({
    kicker: "Wyoming elk and deer",
    name: "Draw odds for every hunt area",
    stat: { big: `${ELK_AREAS.length + DEER_AREAS.length}`, label: "elk and deer hunt areas, with your odds at the points you hold." },
    note: "From Wyoming Game and Fish's draw reports",
    geoms: ELK_AREAS.map((a) => a.geometry),
    locate: false,
    year: ELK_YEAR,
  });
}
