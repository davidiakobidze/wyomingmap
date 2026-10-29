import { DEER_YEAR, deerLicenses, deerSlugs, getDeerPage, herdNames, regionLicenses } from "@/lib/deer";
import { licenseStat, shareCard } from "@/lib/og";

export const alt = "A Wyoming deer hunt area's outline and the preference points its tags took in the draw";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return deerSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: { slug: string } }) {
  const page = getDeerPage(params.slug)!;
  if ("region" in page) {
    const r = page.region;
    const l = regionLicenses(r).find((x) => licenseStat(x, DEER_YEAR));
    return shareCard({
      kicker: "Wyoming deer · Nonresident region",
      name: `Region ${r.region}`,
      stat: l ? licenseStat(l, DEER_YEAR) : null,
      note: `General license good in ${r.generalAreas.length} hunt ${r.generalAreas.length === 1 ? "area" : "areas"}`,
      geoms: r.areas.map((x) => x.geometry),
      year: DEER_YEAR,
    });
  }
  const a = page.area;
  const l = a.closed ? undefined : deerLicenses(a).find((x) => licenseStat(x, DEER_YEAR));
  const herd = herdNames(a);
  return shareCard({
    kicker: `Wyoming deer · Hunt area ${a.area}`,
    name: a.name,
    stat: a.closed ? { big: "Closed", label: `to deer hunting in ${DEER_YEAR}.` } : l ? licenseStat(l, DEER_YEAR) : null,
    note: l?.note ? `${l.id === "general" ? "General" : l.kicker} season ${l.note}` : herd ? `${herd} herd` : undefined,
    geoms: [a.geometry],
    year: DEER_YEAR,
  });
}
