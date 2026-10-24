import type { Metadata } from "next";
import HuntAreaMap from "@/components/HuntAreaMap";
import {
  DEER_AREAS,
  DEER_REGIONS,
  DEER_SOURCES,
  DEER_YEAR,
  deerPath,
  getRegion,
  herdNames,
  regionPath,
  seasonDates,
} from "@/lib/deer";
import { PointsDraw, chanceLabel, firstChoiceChance, marker, pointsNeeded } from "@/lib/hunts";
import { SITE_NAME, SITE_URL, WYOMING_BOUNDS } from "@/lib/site";

const title = `Wyoming deer hunt areas: ${DEER_YEAR} seasons, region draw odds and points, by area`;
const description = `All ${DEER_AREAS.length} Wyoming deer hunt areas and ${DEER_REGIONS.length} nonresident regions on one map, with ${DEER_YEAR} general season dates and the preference points nonresidents needed, from Wyoming Game and Fish's own reports.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/hunting/deer` },
  openGraph: { title, description, url: `${SITE_URL}/hunting/deer` },
};

function need(d?: PointsDraw) {
  if (!d) return "—";
  const n = pointsNeeded(d);
  return n === null ? "Any" : Math.ceil(n);
}

export default function DeerIndex() {
  return (
    <main className="article wide">
      <nav className="crumbs">
        <a href="/">{SITE_NAME}</a> / Deer hunt areas
      </nav>
      <h1>Wyoming deer hunt areas</h1>
      <p className="lede">
        Every deer hunt area in Wyoming, with its {DEER_YEAR} general season and what it took to draw. Most
        areas are open on a general license; nonresidents draw that license by region, so the region table
        comes first. Click an area for its seasons, every limited-quota license, and its legal boundary.
      </p>

      <HuntAreaMap
        areasUrl="/data/deer-hunt-areas.geojson"
        markers={DEER_AREAS.map(marker)}
        bounds={WYOMING_BOUNDS}
        hrefFor="/hunting/deer/area-{area}"
      />

      <h2>Nonresident general-license regions</h2>
      <div className="table-scroll">
        <table className="areas">
          <thead>
            <tr>
              <th>Region</th>
              <th>Areas</th>
              <th>Points needed</th>
              <th>Random-draw odds</th>
              <th>Special: points needed</th>
            </tr>
          </thead>
          <tbody>
            {DEER_REGIONS.map((r) => (
              <tr key={r.region}>
                <td>
                  <a href={regionPath(r.region)}>{r.region}</a>
                </td>
                <td>{r.areas.length}</td>
                <td>{need(r.draws.nrPoints)}</td>
                <td>{r.draws.nrRandom ? chanceLabel(firstChoiceChance(r.draws.nrRandom)) : "—"}</td>
                <td>{need(r.draws.nrSpecialPoints)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>All deer hunt areas</h2>
      <div className="table-scroll">
        <table className="areas">
          <thead>
            <tr>
              <th>Area</th>
              <th>Name</th>
              <th>Herd</th>
              <th>General season</th>
              <th>Region (points)</th>
              <th>Limited-quota licenses</th>
            </tr>
          </thead>
          <tbody>
            {DEER_AREAS.map((a) => (
              <tr key={a.area}>
                <td>
                  <a href={deerPath(a)}>{a.area}</a>
                </td>
                <td>
                  <a href={deerPath(a)}>{a.name}</a>
                </td>
                <td>{herdNames(a)}</td>
                <td>{a.closed ? "Closed" : a.general[0] ? seasonDates(a.general[0]) : "Draw only"}</td>
                <td>
                  <a href={regionPath(a.region)}>{a.region}</a> ({need(getRegion(a.region)?.draws.nrPoints)})
                </td>
                <td>{a.hunts.length ? a.hunts.map((h) => `Type ${h.type}`).join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="fine">
        &ldquo;Points needed&rdquo; is the point level where the {DEER_YEAR} nonresident preference-point draw
        ran out for the region&apos;s general license; at that level only some applicants drew. Random-draw odds
        are licenses divided by first-choice applicants. The general season shown is each area&apos;s first; some
        have later white-tailed seasons. Sources: <a href={DEER_SOURCES.odds}>WGFD draw results and odds</a>,{" "}
        <a href={DEER_SOURCES.seasons}>WGFD Chapter 6 deer seasons</a>, and the{" "}
        <a href={DEER_SOURCES.boundaries}>WGFD deer hunt area boundaries</a>.
      </p>
    </main>
  );
}
