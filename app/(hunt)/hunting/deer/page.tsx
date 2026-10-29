import type { Metadata } from "next";
import AreaIndex, { IndexRow } from "@/components/hunt/AreaIndex";
import HuntMap from "@/components/hunt/HuntMap";
import { Collar } from "@/components/hunt/Sheet";
import {
  DEER_AREAS,
  DEER_REGIONS,
  DEER_SOURCES,
  DEER_YEAR,
  deerLicenses,
  deerPath,
  herdNames,
  regionLicenses,
  regionPath,
} from "@/lib/deer";
import { marker, seasonDates } from "@/lib/hunts";
import { AreaOdds, oddsOf, sureFrom } from "@/lib/license";
import { SITE_URL, WYOMING_BOUNDS } from "@/lib/site";

const title = `Wyoming deer hunt areas: ${DEER_YEAR} seasons, region draw odds and points, by area`;
const description = `All ${DEER_AREAS.length} Wyoming deer hunt areas and ${DEER_REGIONS.length} nonresident regions on one map, with ${DEER_YEAR} general season dates and the preference points nonresidents needed, from Wyoming Game and Fish's own reports.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/hunting/deer` },
  openGraph: { title, description, url: `${SITE_URL}/hunting/deer` },
};

export default function DeerIndex() {
  const regionRows: IndexRow[] = DEER_REGIONS.map((r) => {
    const o = regionLicenses(r)[0] ? oddsOf(regionLicenses(r)[0]) : null;
    return {
      key: r.region,
      num: r.region,
      name: `Region ${r.region}`,
      href: regionPath(r.region),
      sub: `${r.generalAreas.length} areas with a general season`,
      license: "General license",
      need: sureFrom(o),
      odds: o,
    };
  });

  const odds: Record<number, AreaOdds> = {};
  const areaRows: IndexRow[] = DEER_AREAS.map((a) => {
    const l = a.closed ? undefined : deerLicenses(a)[0];
    const o = l ? oddsOf(l) : null;
    if (o) odds[a.area] = o;
    return {
      key: String(a.area),
      num: String(a.area),
      name: a.name,
      href: deerPath(a),
      sub: [herdNames(a), a.general[0] ? `general season ${seasonDates(a.general[0])}` : a.closed ? "closed" : "draw only"]
        .filter(Boolean)
        .join(" · "),
      license: l ? (l.id === "general" ? `Region ${a.region} general` : `${l.kicker}, ${l.title.toLowerCase()}`) : "None",
      need: sureFrom(o),
      odds: o,
    };
  });

  return (
    <>
      <Collar year={DEER_YEAR}>
        <b>Wyoming deer</b> · {DEER_AREAS.length} hunt areas · {DEER_REGIONS.length} nonresident regions ·{" "}
        {DEER_YEAR} seasons and draw
      </Collar>
      <main className="hs-wrap">
        <div className="hs-head">
          <div>
            <h1>
              <span className="kicker">Index to the deer hunt sheets</span>
              Deer hunt areas
            </h1>
            <p className="answer">
              Most Wyoming deer areas open on a general license, which nonresidents draw by region. The map shades
              each area by your chance at the license that gets you in, in the {DEER_YEAR} draw. Set your deer
              points at the top.
            </p>
          </div>
        </div>

        <HuntMap
          species="deer"
          areasUrl="/data/deer-hunt-areas.geojson"
          labels={DEER_AREAS.map(marker)}
          bounds={WYOMING_BOUNDS}
          hrefFor="/hunting/deer/area-{area}"
          odds={odds}
          choropleth
        />

        <section className="hs-sec">
          <div className="sh">
            <h2>Nonresident general-license regions</h2>
            <p>One draw per region, good in every general season inside it.</p>
          </div>
          <AreaIndex species="deer" rows={regionRows} label="a region" />
        </section>

        <section className="hs-sec">
          <div className="sh">
            <h2>Every deer area</h2>
            <p>The region general license where there is a general season, else the area&apos;s main limited-quota license.</p>
          </div>
          <AreaIndex species="deer" rows={areaRows} label="a deer area" />
        </section>

        <p className="fine">
          &ldquo;Points for a sure tag&rdquo; is the lowest whole number of preference points at which every
          nonresident drew in the {DEER_YEAR} point draw. &ldquo;Your chance&rdquo; counts the point draw and the
          random draw everyone who misses it goes into. The general season shown is each area&apos;s first; some
          have later white-tailed seasons. Sources: <a href={DEER_SOURCES.odds}>WGFD draw results and odds</a>,{" "}
          <a href={DEER_SOURCES.seasons}>WGFD Chapter 6 deer seasons</a>, and the{" "}
          <a href={DEER_SOURCES.boundaries}>WGFD deer hunt area boundaries</a>.
        </p>
      </main>
    </>
  );
}
