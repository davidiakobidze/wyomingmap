import { ELK_AREAS, ELK_YEAR, elkLicenses, elkSlug, getElkArea } from "@/lib/elk";
import { licenseStat, shareCard } from "@/lib/og";

export const alt = "A Wyoming elk hunt area's outline and the preference points its tags took in the draw";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return ELK_AREAS.map((a) => ({ area: elkSlug(a) }));
}

export default async function Image({ params }: { params: { area: string } }) {
  const a = getElkArea(params.area)!;
  const licenses = a.closed ? [] : elkLicenses(a);
  const l = licenses.find((x) => licenseStat(x, ELK_YEAR));
  return shareCard({
    kicker: `Wyoming elk · Hunt area ${a.area}`,
    name: a.name,
    stat: a.closed ? { big: "Closed", label: `to elk hunting in ${ELK_YEAR}.` } : l ? licenseStat(l, ELK_YEAR) : null,
    note: l?.note && `${l.id === "general" ? "General" : l.kicker} season ${l.note}`,
    geoms: [a.geometry],
    year: ELK_YEAR,
  });
}
