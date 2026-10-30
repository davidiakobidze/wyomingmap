import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AreaHero from "@/components/hunt/AreaHero";
import DrawBoard from "@/components/hunt/DrawBoard";
import { HarvestNote, HarvestTable, RegionHarvestTable, harvestLead } from "@/components/hunt/HarvestTable";
import HuntMap from "@/components/hunt/HuntMap";
import SeasonTable from "@/components/hunt/SeasonTable";
import { Around, Outfitters } from "@/components/hunt/Sheet";
import { Demand, NonresidentDraws, OddsAssumptions } from "@/components/HuntDraws";
import {
  DEER_REGIONS,
  DEER_SOURCES,
  DEER_YEAR,
  DeerArea,
  DeerHunt,
  DeerRegion,
  deerLicenses,
  deerPath,
  deerSlugs,
  getDeerPage,
  getRegion,
  herdNames,
  mainHunt,
  neighbors,
  regionLicenses,
  regionPath,
} from "@/lib/deer";
import {
  RegionDraws,
  areaFeature,
  collection,
  licensesHeading,
  marker,
  nonresidentPhrase,
  oddsPhrase,
  seasonDates,
  sentences,
  unionBounds,
} from "@/lib/hunts";
import {
  DEER_HARVEST_SOURCE,
  DEER_KINDS,
  HARVEST_REPORTS,
  HARVEST_SEASON,
  deerAreaHarvest,
  deerRegionHarvest,
} from "@/lib/harvest";
import { AreaOdds, oddsOf } from "@/lib/license";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return deerSlugs().map((slug) => ({ slug }));
}

const num = new Intl.NumberFormat("en-US");

// "In the 2026 draw for it, nonresidents needed about 12 preference points; ...", for a region's general license.
function regionPoints(d: RegionDraws): string {
  return d.nrPoints ? ` In the ${DEER_YEAR} draw for it, ${nonresidentPhrase(d.nrPoints, d.nrRandom)}.` : "";
}

function drawParts(h: DeerHunt): string[] {
  const parts: string[] = [];
  if (h.nrPoints) parts.push(nonresidentPhrase(h.nrPoints, h.nrRandom));
  else if (h.nrDoeFawn) parts.push(oddsPhrase("nonresident", h.nrDoeFawn));
  const res = h.resident ?? h.residentDoeFawn;
  if (res) parts.push(oddsPhrase("resident", res));
  return parts;
}

// What people search for, in one or two sentences: when the general season
// is and what a nonresident needs, or for draw-only areas, the draw itself.
function areaHeadline(a: DeerArea): string {
  if (a.closed) return `Deer Hunt Area ${a.area} is closed to deer hunting in ${DEER_YEAR}.`;
  const region = getRegion(a.region);
  if (a.general.length > 0) {
    const g = a.general[0];
    return (
      `Area ${a.area} is open on a general deer license: the ${DEER_YEAR} general season runs ` +
      `${seasonDates(g)}. Nonresidents need a Region ${a.region} general license.` +
      `${region ? regionPoints(region.draws) : ""}`
    );
  }
  const h = mainHunt(a);
  if (!h) return `Area ${a.area} has no general deer season and no limited-quota licenses in ${DEER_YEAR}.`;
  const parts = drawParts(h);
  return (
    `Area ${a.area} has no general deer season; every license is drawn.` +
    (parts.length ? ` ${sentences(`In the ${DEER_YEAR} draw for the Type ${h.type} license,`, parts)}` : "")
  );
}

function regionHeadline(r: DeerRegion): string {
  const draw = r.draws.nrPoints ? nonresidentPhrase(r.draws.nrPoints, r.draws.nrRandom) : "";
  return (
    `In the ${DEER_YEAR} draw for Wyoming's Region ${r.region} nonresident general deer license, ` +
    `${draw}. The license is good in ${r.generalAreas.length} hunt ${r.generalAreas.length === 1 ? "area" : "areas"} during their general seasons.`
  );
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getDeerPage(params.slug);
  if (!page) return {};
  let title: string, description: string, path: string;
  if ("area" in page) {
    const a = page.area;
    path = deerPath(a);
    title = `Wyoming Deer Area ${a.area} (${a.name}): ${DEER_YEAR} seasons, draw odds and map`;
    description = `${areaHeadline(a)} Season dates, every limited-quota license, ${HARVEST_SEASON} hunter success, the area boundary on a map, and its legal description.`;
  } else {
    const r = page.region;
    path = regionPath(r.region);
    title = `Wyoming Deer Region ${r.region}: ${DEER_YEAR} draw odds and points needed`;
    description = `${regionHeadline(r)} Point-by-point results and a map of every area in the region.`;
  }
  const url = `${SITE_URL}${path}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

function Hunt({ h }: { h: DeerHunt }) {
  return (
    <section className="hs-hunt" id={`type-${h.type}`}>
      <h3>
        Type {h.type} · {h.description}
      </h3>
      {h.seasons.length > 0 && <SeasonTable seasons={h.seasons} game="deer" showQuota />}
      <ul className="draws">
        <NonresidentDraws d={h} />
        {h.nrDoeFawn && <Demand label="Nonresident" d={h.nrDoeFawn} />}
        {h.resident && <Demand label="Resident" d={h.resident} />}
        {h.residentDoeFawn && <Demand label="Resident" d={h.residentDoeFawn} />}
      </ul>
    </section>
  );
}

// Each area's first license for a nonresident, for the map's hover labels.
function mapOdds(areas: DeerArea[]): Record<number, AreaOdds> {
  const out: Record<number, AreaOdds> = {};
  areas.forEach((x) => {
    const l = deerLicenses(x)[0];
    const o = l && oddsOf(l);
    if (o) out[x.area] = o;
  });
  return out;
}

function HowToRead() {
  return (
    <section className="hs-sec hs-read">
      <div className="sh">
        <h2>How to read this</h2>
      </div>
      <p>
        Draw results are what happened in the {DEER_YEAR} draw, published by Wyoming Game and Fish. They are not
        a forecast; quotas and applicant numbers change every year. A nonresident&apos;s chance counts both the
        preference-point draw and the random draw that everyone who misses it goes into; WGFD&apos;s own tables
        show only the first, so they understate it. Resident and doe/fawn draws are random: the percentage shown
        is licenses divided by first-choice applicants, before second and third choices.
      </p>
      <p>
        Season dates and legal deer are from WGFD Chapter 6, Deer Hunting Seasons. Where a draw report and the
        regulation describe a license differently, this page uses the regulation&apos;s wording.
      </p>
      <p className="fine">
        Sources: <a href={DEER_SOURCES.odds}>WGFD draw results and odds</a> ({DEER_YEAR}),{" "}
        <a href={DEER_SOURCES.seasons}>WGFD Chapter 6 deer seasons</a>, and the{" "}
        <a href={DEER_SOURCES.boundaries}>WGFD deer hunt area boundaries</a>. Terrain from the AWS Terrain Tiles
        elevation set; base map from OpenStreetMap. Boundaries on the map are for general location, not a survey.
        Check the current regulations before you hunt.
      </p>
    </section>
  );
}

function AreaPage({ a }: { a: DeerArea }) {
  const near = neighbors(a);
  const shown = [a, ...near];
  const region = getRegion(a.region);
  const herds = [a.muleDeerHerd, a.whitetailHerd].filter((h, i, all): h is { unit: number; name: string } =>
    !!h && all.findIndex((x) => x?.unit === h.unit) === i
  );

  const licenses = a.closed ? [] : deerLicenses(a);
  const harvest = deerAreaHarvest(a.area);
  const tables = DEER_KINDS.map((k) => ({ ...k, h: harvest[k.kind] })).filter(
    (x): x is typeof x & { h: NonNullable<typeof x.h> } => !!x.h && x.h.total.hunters > 0
  );
  const describe = (t: string) => {
    if (t === "GEN") return "General season";
    const h = a.hunts.find((x) => x.type === t);
    return h ? `Type ${t} · ${h.description}` : `Type ${t}`;
  };

  return (
    <>
      <AreaHero
        species="deer"
        focus={collection([areaFeature(a)])}
        bbox={a.bbox}
        crumbs={[{ href: "/hunting/deer", label: "Deer hunt areas" }, { label: `Area ${a.area}` }]}
        kicker={`Deer hunt area ${a.area}${herdNames(a) ? ` · ${herdNames(a)} herd` : ""}`}
        name={a.name}
        answer={areaHeadline(a)}
        num={String(a.area)}
        facts={[
          `Deer hunt area ${a.area}`,
          `region ${a.region}`,
          ...herds.map((h) => `herd unit ${h.unit}`),
          `${num.format(a.sqMiles)} sq mi`,
        ].join(" · ")}
        license={licenses[0]}
        none={
          a.closed
            ? `Area ${a.area} is closed to deer hunting in ${DEER_YEAR}.`
            : `No deer licenses were drawn for Area ${a.area} in ${DEER_YEAR}.`
        }
      />
      <main className="hs-wrap">
        <section className="hs-sec" id="licenses">
          <div className="sh">
            <h2>{licensesHeading(licenses.length, `Area ${a.area}`)}</h2>
            {licenses.length > 0 && (
              <p>Your chance at the points you hold, the points that drew in {DEER_YEAR}, and the whole draw replayed.</p>
            )}
          </div>
          <DrawBoard
            species="deer"
            year={DEER_YEAR}
            where={`Area ${a.area}`}
            licenses={licenses}
            map={
              <HuntMap
                species="deer"
                areas={collection(shown.map((x) => areaFeature(x)))}
                labels={shown.map(marker)}
                bounds={a.bbox}
                highlight={[a.area]}
                hrefFor="/hunting/deer/area-{area}"
                odds={mapOdds(shown)}
                legend={`Area ${a.area}`}
              />
            }
          />
        </section>

        {tables.length > 0 && (
          <section className="hs-sec" id="success">
            <div className="sh">
              <h2>How hunters did in {HARVEST_SEASON}</h2>
              <p>
                {tables.map((t) => `${t.label}: ${harvestLead(t.h, `a ${t.label.toLowerCase()}`)}`).join(" ")}
              </p>
            </div>
            <div className="hs-harvests">
              {tables.map((t) => (
                <HarvestTable key={t.kind} h={t.h} caption={t.label} describe={describe} />
              ))}
            </div>
            <HarvestNote source={DEER_HARVEST_SOURCE} reports={HARVEST_REPORTS} />
          </section>
        )}

        <section className="hs-sec" id="details">
          <div className="sh">
            <h2>Seasons and draw details</h2>
            <p>Every {DEER_YEAR} season and draw for Area {a.area}.</p>
          </div>
          {a.general.length > 0 && (
            <section className="hs-hunt" id="general">
              <h3>General season</h3>
              <p>
                Residents hunt Area {a.area} on a general deer license. Nonresidents need the{" "}
                <a href={regionPath(a.region)}>Region {a.region} general license</a>, which is drawn for the whole
                region and is good in the general seasons of {region?.generalAreas.length} areas.
              </p>
              <SeasonTable seasons={a.general} game="deer" />
              {region && (
                <ul className="draws">
                  <NonresidentDraws d={region.draws} />
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
          {a.closed && <p>Deer Hunt Area {a.area} is closed to deer hunting in {DEER_YEAR}.</p>}
          {!a.closed && a.general.length === 0 && a.hunts.length === 0 && (
            <p>
              No deer seasons are listed for this area in {DEER_YEAR}; the{" "}
              <a href="https://wgfd.wyo.gov/regulations">WGFD deer regulations</a> have the details.
            </p>
          )}
          {(a.general.length > 0 || a.hunts.some((h) => h.nrPoints)) && <OddsAssumptions year={DEER_YEAR} />}
          {a.boundary && (
            <details className="boundary">
              <summary>Legal boundary description</summary>
              <p>{a.boundary}</p>
            </details>
          )}
        </section>

        <Around a={a} near={near} href={deerPath} species="deer" />
        {!a.closed && <Outfitters where={`Area ${a.area}`} subject={`Outfitter listing: Deer Area ${a.area}`} />}
        <HowToRead />
      </main>
    </>
  );
}

function RegionPage({ r }: { r: DeerRegion }) {
  const licenses = regionLicenses(r);
  const byKind = deerRegionHarvest(r.region);
  const harvestRows = DEER_KINDS.flatMap((k) => {
    const s = byKind[k.kind];
    return s && s.hunters > 0 ? [{ label: k.label, s }] : [];
  });

  return (
    <>
      <AreaHero
        species="deer"
        focus={collection(r.areas.map((x) => areaFeature(x)))}
        bbox={unionBounds(r.areas)}
        crumbs={[{ href: "/hunting/deer", label: "Deer hunt areas" }, { label: `Region ${r.region}` }]}
        kicker="Deer · nonresident general license"
        name={`Region ${r.region}`}
        answer={regionHeadline(r)}
        num={r.region}
        facts={`Deer region ${r.region} · ${r.areas.length} hunt areas · ${r.generalAreas.length} with a general season`}
        license={licenses[0]}
        none={`No Region ${r.region} general licenses were drawn in ${DEER_YEAR}.`}
      />
      <main className="hs-wrap">
        <section className="hs-sec" id="licenses">
          <div className="sh">
            <h2>{licensesHeading(licenses.length, `Region ${r.region}`)}</h2>
            <p>
              One nonresident license for the general seasons of {r.generalAreas.length} areas. Your chance at the
              points you hold, and the whole draw replayed.
            </p>
          </div>
          <DrawBoard
            species="deer"
            year={DEER_YEAR}
            where={`Region ${r.region}`}
            licenses={licenses}
            map={
              <HuntMap
                species="deer"
                areas={collection(r.areas.map((x) => areaFeature(x)))}
                labels={r.areas.map(marker)}
                bounds={unionBounds(r.areas)}
                highlight={r.areas.map((x) => x.area)}
                hrefFor="/hunting/deer/area-{area}"
                legend={`Region ${r.region}`}
              />
            }
          />
        </section>

        <section className="hs-sec" id="details">
          <div className="sh">
            <h2>{DEER_YEAR} draw details</h2>
          </div>
          <ul className="draws">
            <NonresidentDraws d={r.draws} />
          </ul>
          <OddsAssumptions year={DEER_YEAR} />
        </section>

        {harvestRows.length > 0 && (
          <section className="hs-sec" id="success">
            <div className="sh">
              <h2>How Region {r.region} hunters did in {HARVEST_SEASON}</h2>
              <p>
                Nonresidents hunting on the Region {r.region} general license, by the deer they went after. A hunter
                after both counts in both rows.
              </p>
            </div>
            <RegionHarvestTable rows={harvestRows} />
            <HarvestNote source={DEER_HARVEST_SOURCE} reports={HARVEST_REPORTS} />
          </section>
        )}

        <section className="hs-sec">
          <div className="sh">
            <h2>Areas in Region {r.region}</h2>
            <p>
              The first general season for each area; some have later white-tailed seasons. A region license is
              not valid in draw-only areas.
            </p>
          </div>
          <div className="table-scroll">
            <table className="index">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Name</th>
                  <th>General season</th>
                  <th className="hide-sm">Legal deer</th>
                </tr>
              </thead>
              <tbody>
                {r.areas.map((a) => (
                  <tr key={a.area}>
                    <td className="area">{a.area}</td>
                    <td className="name">
                      <a href={deerPath(a)}>{a.name}</a>
                    </td>
                    <td>{a.closed ? "Closed" : a.general[0] ? seasonDates(a.general[0]) : "Draw only"}</td>
                    <td className="hide-sm sub">{a.general[0]?.limitations ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Outfitters where={`Region ${r.region}`} subject={`Outfitter listing: Deer Region ${r.region}`} />

        <section className="hs-sec">
          <div className="sh">
            <h2>Other deer regions</h2>
          </div>
          <ul className="hs-nearby">
            {DEER_REGIONS.filter((o) => o.region !== r.region).map((o) => (
              <li key={o.region}>
                <a href={regionPath(o.region)}>
                  <b>{o.region}</b> Region {o.region}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <HowToRead />
      </main>
    </>
  );
}

export default function DeerPage({ params }: { params: { slug: string } }) {
  const page = getDeerPage(params.slug);
  if (!page) notFound();
  return "area" in page ? <AreaPage a={page.area} /> : <RegionPage r={page.region} />;
}
