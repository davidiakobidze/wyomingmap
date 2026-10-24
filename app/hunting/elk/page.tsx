import type { Metadata } from "next";
import HuntAreaMap from "@/components/HuntAreaMap";
import { ELK_AREAS, ELK_SOURCES, ELK_YEAR, elkPath, mainHunt } from "@/lib/elk";
import { chanceLabel, firstChoiceChance, marker, pointsNeeded } from "@/lib/hunts";
import { SITE_NAME, SITE_URL, WYOMING_BOUNDS } from "@/lib/site";

const title = `Wyoming elk hunt areas: ${ELK_YEAR} draw odds and points needed, by area`;
const description = `All ${ELK_AREAS.length} Wyoming elk hunt areas on one map, with the preference points nonresidents needed and residents' odds in the ${ELK_YEAR} draw, from Wyoming Game and Fish's own reports.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}/hunting/elk` },
  openGraph: { title, description, url: `${SITE_URL}/hunting/elk` },
};

export default function ElkIndex() {
  const rows = ELK_AREAS.map((a) => {
    const h = mainHunt(a);
    return {
      a,
      h,
      need: h?.nrPoints ? pointsNeeded(h.nrPoints) : undefined,
      res: h?.resident ? firstChoiceChance(h.resident) : undefined,
    };
  });

  return (
    <main className="article wide">
      <nav className="crumbs">
        <a href="/">{SITE_NAME}</a> / Elk hunt areas
      </nav>
      <h1>Wyoming elk hunt areas</h1>
      <p className="lede">
        Every elk hunt area in Wyoming, with what it took to draw a license in {ELK_YEAR}: the preference
        points nonresidents needed, and residents&apos; first-choice odds. Click an area on the map or in the
        table for every license type, point by point.
      </p>

      <HuntAreaMap
        areasUrl="/data/elk-hunt-areas.geojson"
        markers={ELK_AREAS.map(marker)}
        bounds={WYOMING_BOUNDS}
        hrefFor="/hunting/elk/area-{area}"
      />

      <div className="table-scroll">
        <table className="areas">
          <thead>
            <tr>
              <th>Area</th>
              <th>Name</th>
              <th>Herd</th>
              <th>Main license</th>
              <th>Nonresident points needed</th>
              <th>Resident first-choice odds</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, h, need, res }) => (
              <tr key={a.area}>
                <td>
                  <a href={elkPath(a)}>{a.area}</a>
                </td>
                <td>
                  <a href={elkPath(a)}>{a.name}</a>
                </td>
                <td>{a.herdName}</td>
                <td>{h ? `Type ${h.type}, ${h.description.toLowerCase()}` : "None drawn"}</td>
                <td>{need === undefined ? "—" : need === null ? "Any" : Math.ceil(need)}</td>
                <td>{res === undefined ? "—" : chanceLabel(res)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="fine">
        &ldquo;Points needed&rdquo; is the point level where the {ELK_YEAR} nonresident preference-point draw ran
        out for the area&apos;s main any-elk license; at that level only some applicants drew. Resident odds are
        licenses divided by first-choice applicants. Sources:{" "}
        <a href={ELK_SOURCES.odds}>WGFD draw results and odds</a> and the{" "}
        <a href={ELK_SOURCES.boundaries}>WGFD elk hunt area boundaries</a>.
      </p>
    </main>
  );
}
