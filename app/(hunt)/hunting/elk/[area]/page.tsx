import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AreaHero from "@/components/hunt/AreaHero";
import DrawBoard from "@/components/hunt/DrawBoard";
import HuntMap from "@/components/hunt/HuntMap";
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
} from "@/lib/elk";
import { areaFeature, collection, licensesHeading, marker, nonresidentPhrase, oddsPhrase, sentences } from "@/lib/hunts";
import { AreaOdds, oddsOf } from "@/lib/license";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return ELK_AREAS.map((a) => ({ area: elkSlug(a) }));
}

const num = new Intl.NumberFormat("en-US");

// The two numbers people search for: what a nonresident needs in points (and
// their chance without them) and what a resident's odds were, for the area's
// main any-elk hunt.
function headline(a: ElkArea): string {
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
  const title = `Wyoming Elk Area ${a.area} (${a.name}): ${ELK_YEAR} draw odds, points and map`;
  const description = `${headline(a)} Every license type for Elk Hunt Area ${a.area}, the ${a.herdName} herd, with preference-point odds and the area boundary on a map.`;
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
  const licenses = elkLicenses(a);

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
        none={`Wyoming Game and Fish drew no limited-quota elk licenses for Area ${a.area} in ${ELK_YEAR}.`}
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
            <h2>Draw details</h2>
            <p>Every {ELK_YEAR} draw for Area {a.area}, point level by point level.</p>
          </div>
          {a.hunts.length === 0 ? (
            <p>
              Wyoming Game and Fish drew no limited-quota elk licenses for this area in {ELK_YEAR}. It may be
              hunted on a general license or closed to elk hunting; the{" "}
              <a href="https://wgfd.wyo.gov/regulations">WGFD elk regulations</a> say which.
            </p>
          ) : (
            <div className="hs-hunts">
              {a.hunts.map((h) => (
                <Hunt key={h.type} h={h} />
              ))}
            </div>
          )}
          {a.hunts.some((h) => h.nrPoints) && <OddsAssumptions year={ELK_YEAR} />}
        </section>

        <Around a={a} near={near} href={elkPath} species="elk" />
        <Outfitters where={`Area ${a.area}`} subject={`Outfitter listing: Elk Area ${a.area}`} />

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
          <p className="fine">
            Sources: <a href={ELK_SOURCES.odds}>WGFD draw results and odds</a> ({ELK_YEAR}) and the{" "}
            <a href={ELK_SOURCES.boundaries}>WGFD elk hunt area boundaries</a>. Terrain from the AWS Terrain Tiles
            elevation set; base map from OpenStreetMap. Boundaries are for general location, not a survey. Check
            season dates and boundary descriptions in the WGFD regulations before you hunt.
          </p>
        </section>
      </main>
    </>
  );
}
