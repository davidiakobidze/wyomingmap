import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AreaHero from "@/components/hunt/AreaHero";
import DrawBoard from "@/components/hunt/DrawBoard";
import HuntMap from "@/components/hunt/HuntMap";
import SeasonTable from "@/components/hunt/SeasonTable";
import { Around, Outfitters } from "@/components/hunt/Sheet";
import { Demand, NonresidentDraws, OddsAssumptions } from "@/components/HuntDraws";
import {
  ELK_AREAS,
  ELK_SOURCES,
  ELK_YEAR,
  ElkArea,
  ElkHunt,
  elkLicenses,
  elkPath,
  elkSlug,
  getElkArea,
  mainHunt,
  neighbors,
  regionDraws,
} from "@/lib/elk";
import {
  areaFeature,
  collection,
  licensesHeading,
  marker,
  nonresidentPhrase,
  oddsPhrase,
  seasonDates,
  sentences,
} from "@/lib/hunts";
import { AreaOdds, oddsOf } from "@/lib/license";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return ELK_AREAS.map((a) => ({ area: elkSlug(a) }));
}

const num = new Intl.NumberFormat("en-US");

// What people search for, in one or two sentences. In a general-season area:
// when the season is and the region license a nonresident needs. Elsewhere,
// what a nonresident needs in points (and their chance without them) and what
// a resident's odds were, for the area's main any-elk hunt.
function headline(a: ElkArea): string {
  if (a.closed) return `Elk Hunt Area ${a.area} is closed to elk hunting in ${ELK_YEAR}.`;
  if (a.general.length > 0) {
    const g = a.general[0];
    const d = regionDraws(a);
    return (
      `Area ${a.area} is open on a general elk license: the ${ELK_YEAR} general season runs ${seasonDates(g)} ` +
      `for ${g.limitations[0].toLowerCase()}${g.limitations.slice(1)}. Nonresidents need ${/^[AEIOU]/.test(a.region) ? "an" : "a"} ${a.region} region general license.` +
      (d?.nrPoints ? ` In the ${ELK_YEAR} draw for it, ${nonresidentPhrase(d.nrPoints, d.nrRandom)}.` : "")
    );
  }
  const h = mainHunt(a);
  if (!h) return `No limited-quota elk licenses were drawn for Area ${a.area} in ${ELK_YEAR}.`;
  const parts: string[] = [];
  if (h.nrPoints) {
    parts.push(nonresidentPhrase(h.nrPoints, h.nrRandom));
  } else if (h.nrCowCalf) {
    parts.push(oddsPhrase("nonresident", h.nrCowCalf));
  }
  const res = h.resident ?? h.residentCowCalf;
  if (res) parts.push(oddsPhrase("resident", res));
  if (parts.length === 0) return `Area ${a.area} had a Type ${h.type} license in the ${ELK_YEAR} draw.`;
  return sentences(`In the ${ELK_YEAR} draw for the Type ${h.type} ${h.description.toLowerCase()} license,`, parts);
}

export function generateMetadata({ params }: { params: { area: string } }): Metadata {
  const a = getElkArea(params.area);
  if (!a) return {};
  const url = `${SITE_URL}${elkPath(a)}`;
  const title = `Wyoming Elk Area ${a.area} (${a.name}): ${ELK_YEAR} draw odds, seasons and map`;
  const description = a.closed
    ? `${headline(a)} The area boundary on a map, and its legal description.`
    : `${headline(a)} Season dates and every license type for Elk Hunt Area ${a.area}, the ${a.herdName} herd, with preference-point odds and the area boundary on a map.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

function Hunt({ h }: { h: ElkHunt }) {
  return (
    <section className="hs-hunt" id={`type-${h.type}`}>
      <h3>
        Type {h.type} · {h.description}
      </h3>
      {h.seasons.length > 0 && <SeasonTable seasons={h.seasons} game="elk" showQuota />}
      <ul className="draws">
        <NonresidentDraws d={h} />
        {h.nrCowCalf && <Demand label="Nonresident" d={h.nrCowCalf} />}
        {h.resident && <Demand label="Resident" d={h.resident} />}
        {h.residentCowCalf && <Demand label="Resident" d={h.residentCowCalf} />}
      </ul>
    </section>
  );
}

// The main license's nonresident odds for each area on the map, for the hover label.
function mapOdds(areas: ElkArea[]): Record<number, AreaOdds> {
  const out: Record<number, AreaOdds> = {};
  areas.forEach((x) => {
    const o = elkLicenses(x)[0] && oddsOf(elkLicenses(x)[0]);
    if (o) out[x.area] = o;
  });
  return out;
}

export default function ElkAreaPage({ params }: { params: { area: string } }) {
  const a = getElkArea(params.area);
  if (!a) notFound();
  const near = neighbors(a);
  const shown = [a, ...near];
  const licenses = a.closed ? [] : elkLicenses(a);
  const region = regionDraws(a);

  return (
    <>
      <AreaHero
        species="elk"
        focus={collection([areaFeature(a)])}
        bbox={a.bbox}
        crumbs={[{ href: "/hunting/elk", label: "Elk hunt areas" }, { label: `Area ${a.area}` }]}
        kicker={`Elk hunt area ${a.area} · ${a.herdName} herd`}
        name={a.name}
        answer={headline(a)}
        num={String(a.area)}
        facts={`Elk hunt area ${a.area} · ${a.region} region · herd unit ${a.herdUnit} · ${num.format(a.sqMiles)} sq mi`}
        license={licenses[0]}
        none={
          a.closed
            ? `Area ${a.area} is closed to elk hunting in ${ELK_YEAR}.`
            : `Wyoming Game and Fish drew no elk licenses for Area ${a.area} in ${ELK_YEAR}.`
        }
      />
      <main className="hs-wrap">
        <section className="hs-sec" id="licenses">
          <div className="sh">
            <h2>{licensesHeading(licenses.length, `Area ${a.area}`)}</h2>
            {licenses.length > 0 && (
              <p>Your chance at the points you hold, the points that drew in {ELK_YEAR}, and the whole draw replayed.</p>
            )}
          </div>
          <DrawBoard
            species="elk"
            year={ELK_YEAR}
            where={`Area ${a.area}`}
            licenses={licenses}
            map={
              <HuntMap
                species="elk"
                areas={collection(shown.map((x) => areaFeature(x)))}
                labels={shown.map(marker)}
                bounds={a.bbox}
                highlight={[a.area]}
                hrefFor="/hunting/elk/area-{area}"
                odds={mapOdds(shown)}
                legend={`Area ${a.area}`}
              />
            }
          />
        </section>

        <section className="hs-sec" id="details">
          <div className="sh">
            <h2>Seasons and draw details</h2>
            <p>Every {ELK_YEAR} season and draw for Area {a.area}.</p>
          </div>
          {a.general.length > 0 && (
            <section className="hs-hunt" id="general">
              <h3>General season</h3>
              <p>
                Residents hunt Area {a.area} on a general elk license. Nonresidents need the {a.region} region
                general license, which is drawn for the whole region and is good in the general season of every
                area in it that has one.
              </p>
              <SeasonTable seasons={a.general} game="elk" />
              {region && (
                <ul className="draws">
                  <NonresidentDraws d={region} />
                </ul>
              )}
            </section>
          )}
          {a.hunts.length > 0 && (
            <div className="hs-hunts">
              {a.hunts.map((h) => (
                <Hunt key={h.type} h={h} />
              ))}
            </div>
          )}
          {a.closed && <p>Elk Hunt Area {a.area} is closed to elk hunting in {ELK_YEAR}.</p>}
          {!a.closed && a.general.length === 0 && a.hunts.length === 0 && (
            <p>
              No elk seasons are listed for this area in {ELK_YEAR}; the{" "}
              <a href="https://wgfd.wyo.gov/regulations">WGFD elk regulations</a> have the details.
            </p>
          )}
          {(a.general.length > 0 || a.hunts.some((h) => h.nrPoints)) && <OddsAssumptions year={ELK_YEAR} />}
          {a.boundary && (
            <details className="boundary">
              <summary>Legal boundary description</summary>
              <p>{a.boundary}</p>
            </details>
          )}
        </section>

        <Around a={a} near={near} href={elkPath} species="elk" />
        {!a.closed && <Outfitters where={`Area ${a.area}`} subject={`Outfitter listing: Elk Area ${a.area}`} />}

        <section className="hs-sec hs-read">
          <div className="sh">
            <h2>How to read this</h2>
          </div>
          <p>
            Odds are what happened in the {ELK_YEAR} draw, published by Wyoming Game and Fish. They are not a
            forecast; quotas and applicant numbers change every year. A nonresident&apos;s chance counts both the
            preference-point draw and the random draw that everyone who misses it goes into; WGFD&apos;s own
            tables show only the first, so they understate it. Resident and cow/calf draws are random: the
            percentage shown is licenses divided by first-choice applicants, before second and third choices.
          </p>
          <p>
            Season dates and legal elk are from WGFD Chapter 7, Elk Hunting Seasons. Where a draw report and the
            regulation describe a license differently, this page uses the regulation&apos;s wording.
          </p>
          <p className="fine">
            Sources: <a href={ELK_SOURCES.odds}>WGFD draw results and odds</a> ({ELK_YEAR}),{" "}
            <a href={ELK_SOURCES.seasons}>WGFD Chapter 7 elk seasons</a>, and the{" "}
            <a href={ELK_SOURCES.boundaries}>WGFD elk hunt area boundaries</a>. Terrain from the AWS Terrain Tiles
            elevation set; base map from OpenStreetMap. Boundaries on the map are for general location, not a
            survey. Check the current regulations before you hunt.
          </p>
        </section>
      </main>
    </>
  );
}
