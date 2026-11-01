import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import AreaIndex, { IndexRow } from "@/components/hunt/AreaIndex";
import HuntMap from "@/components/hunt/HuntMap";
import { Collar } from "@/components/hunt/Sheet";
import { ELK_AREAS, ELK_SOURCES, ELK_YEAR, elkLicenses, elkPath } from "@/lib/elk";
import { marker, seasonDates } from "@/lib/hunts";
import { AreaOdds, oddsOf, sureFrom } from "@/lib/license";
import { breadcrumbs, huntDataset } from "@/lib/seo";
import { SITE_NAME, SITE_URL, WYOMING_BOUNDS } from "@/lib/site";

const title = `Wyoming Elk Hunt Area Map: ${ELK_YEAR} Draw Odds, Seasons and Points Needed`;
const description = `All ${ELK_AREAS.length} Wyoming elk hunt areas on one map, with ${ELK_YEAR} seasons, the preference points nonresidents needed and residents' odds in the ${ELK_YEAR} draw, from Wyoming Game and Fish's own reports.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/hunting/elk` },
  openGraph: { title, description, url: `${SITE_URL}/hunting/elk` },
};

export default function ElkIndex() {
  const odds: Record<number, AreaOdds> = {};
  const rows: IndexRow[] = ELK_AREAS.map((a) => {
    const l = elkLicenses(a)[0];
    const o = l ? oddsOf(l) : null;
    if (o) odds[a.area] = o;
    return {
      key: String(a.area),
      num: String(a.area),
      name: a.name,
      href: elkPath(a),
      sub: [`${a.herdName} herd`, a.general[0] ? `general season ${seasonDates(a.general[0])}` : a.closed ? "closed" : "draw only"].join(" · "),
      license: l ? (l.id === "general" ? `${a.region} general` : `${l.kicker}, ${l.title.toLowerCase()}`) : a.closed ? "Closed" : "None drawn",
      need: sureFrom(o),
      odds: o,
    };
  });

  return (
    <>
      <JsonLd
        data={{
          "@graph": [
            breadcrumbs([{ href: "/", label: SITE_NAME }, { label: "Elk hunt areas" }]),
            huntDataset({
              path: "/hunting/elk",
              name: `Wyoming elk hunt areas: ${ELK_YEAR} draw odds and seasons`,
              description,
              year: ELK_YEAR,
              sources: [ELK_SOURCES.odds, ELK_SOURCES.seasons, ELK_SOURCES.boundaries],
              geojson: "/data/elk-hunt-areas.geojson",
              measures: ["Preference points needed", "Licenses issued", "Applicants", "Season dates", "Quota"],
            }),
          ],
        }}
      />
      <Collar year={ELK_YEAR}>
        <b>Wyoming elk</b> · {ELK_AREAS.length} hunt areas · {ELK_YEAR} draw results
      </Collar>
      <main className="hs-wrap">
        <div className="hs-head">
          <div>
            <h1>
              <span className="kicker">Index to the elk hunt sheets</span>
              Wyoming elk hunt areas
            </h1>
            <p className="answer">
              Every elk hunt area in Wyoming, shaded by your chance at its main license in the {ELK_YEAR} draw.
              Set your elk points at the top and the map and table answer for you. Click an area for its sheet,
              or open the <a href="/hunting/elk/finder">hunt finder</a> to rank every license by your chance and
              last season&apos;s hunter success.
            </p>
          </div>
        </div>

        <HuntMap
          species="elk"
          areasUrl="/data/elk-hunt-areas.geojson"
          labels={ELK_AREAS.map(marker)}
          bounds={WYOMING_BOUNDS}
          hrefFor="/hunting/elk/area-{area}"
          odds={odds}
          choropleth
        />

        <section className="hs-sec">
          <div className="sh">
            <h2>Every elk area</h2>
            <p>
              The license a nonresident applies for in each area: the region general license where there is a
              general season, else the main limited-quota license. Sort by your chance to find a tag.
            </p>
          </div>
          <AreaIndex species="elk" rows={rows} label="an elk area" />
        </section>

        <p className="fine">
          &ldquo;Points for a sure tag&rdquo; is the lowest whole number of preference points at which every
          nonresident drew in the {ELK_YEAR} point draw. &ldquo;Your chance&rdquo; counts the point draw and the
          random draw everyone who misses it goes into; for cow/calf licenses it is the random draw alone. Sources:{" "}
          <a href={ELK_SOURCES.odds}>WGFD draw results and odds</a> and the{" "}
          <a href={ELK_SOURCES.boundaries}>WGFD elk hunt area boundaries</a>.
        </p>
      </main>
    </>
  );
}
