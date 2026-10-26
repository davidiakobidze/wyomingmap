import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HuntAreaMap from "@/components/HuntAreaMap";
import { Demand, NonresidentDraws, OddsAssumptions } from "@/components/HuntDraws";
import {
  DEER_REGIONS,
  DEER_SOURCES,
  DEER_YEAR,
  DeerArea,
  DeerHunt,
  DeerRegion,
  Season,
  deerPath,
  deerSlugs,
  getDeerPage,
  getRegion,
  herdNames,
  mainHunt,
  neighbors,
  regionPath,
  seasonDates,
} from "@/lib/deer";
import {
  RegionDraws,
  areaFeature,
  collection,
  marker,
  nonresidentPhrase,
  oddsPhrase,
  sentences,
  unionBounds,
} from "@/lib/hunts";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

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
    description = `${areaHeadline(a)} Season dates, every limited-quota license, the area boundary on a map, and its legal description.`;
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

function SeasonTable({ seasons, showQuota }: { seasons: Season[]; showQuota?: boolean }) {
  return (
    <div className="table-scroll">
      <table className="seasons">
        <thead>
          <tr>
            <th>Season</th>
            <th>Special archery</th>
            {showQuota && <th>Quota</th>}
            <th>Legal deer</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s, i) => (
            <tr key={i}>
              <td>{seasonDates(s)}</td>
              <td>{s.archery ? `${s.archery[0]} to ${s.archery[1]}` : "—"}</td>
              {showQuota && <td>{typeof s.quota === "number" ? num.format(s.quota) : s.quota ?? "—"}</td>}
              <td>{s.limitations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Hunt({ h }: { h: DeerHunt }) {
  return (
    <section className="hunt" id={`type-${h.type}`}>
      <h3>
        Type {h.type} · {h.description}
      </h3>
      {h.seasons.length > 0 && <SeasonTable seasons={h.seasons} showQuota />}
      <ul className="draws">
        <NonresidentDraws d={h} />
        {h.nrDoeFawn && <Demand label="Nonresident" d={h.nrDoeFawn} />}
        {h.resident && <Demand label="Resident" d={h.resident} />}
        {h.residentDoeFawn && <Demand label="Resident" d={h.residentDoeFawn} />}
      </ul>
    </section>
  );
}

function Outfitters({ where, subject }: { where: string; subject: string }) {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    "Outfitter name:\nWyoming outfitter license number:\nAreas you guide in:\nWebsite:\n"
  )}`;
  return (
    <aside className="callout">
      <h2>Outfitters licensed in {where}</h2>
      <p>
        Hunters reading this page are deciding where to apply. If you guide in {where}, you can be listed here
        with your name, a photo, and a link to your site.
      </p>
      <a className="button" href={mailto}>
        Get listed
      </a>
    </aside>
  );
}

function HowToRead() {
  return (
    <>
      <h2>How to read this</h2>
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
        <a href={DEER_SOURCES.boundaries}>WGFD deer hunt area boundaries</a>. Boundaries on the map are for
        general location, not a survey. Check the current regulations before you hunt.
      </p>
    </>
  );
}

function AreaPage({ a }: { a: DeerArea }) {
  const near = neighbors(a);
  const shown = [a, ...near];
  const region = getRegion(a.region);
  const herds = [
    a.muleDeerHerd && { label: "Mule deer herd", h: a.muleDeerHerd },
    a.whitetailHerd && { label: "White-tailed deer herd", h: a.whitetailHerd },
  ].filter((x): x is { label: string; h: { unit: number; name: string } } => !!x);

  return (
    <main className="article wide">
      <nav className="crumbs">
        <a href="/">{SITE_NAME}</a> / <a href="/hunting/deer">Deer hunt areas</a> / Area {a.area}
      </nav>
      <h1>
        Deer Hunt Area {a.area}: {a.name}
      </h1>
      <p className="lede">{areaHeadline(a)}</p>

      <HuntAreaMap
        areas={collection(shown.map((x) => areaFeature(x)))}
        markers={shown.map(marker)}
        bounds={a.bbox}
        highlight={a.area}
        hrefFor="/hunting/deer/area-{area}"
      />

      <dl className="facts">
        {herds.map(({ label, h }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {h.name} ({h.unit})
            </dd>
          </div>
        ))}
        <div>
          <dt>Size</dt>
          <dd>{num.format(a.sqMiles)} sq mi</dd>
        </div>
        <div>
          <dt>Nonresident region</dt>
          <dd>
            <a href={regionPath(a.region)}>Region {a.region}</a>
          </dd>
        </div>
      </dl>

      {a.general.length > 0 && (
        <section className="hunt" id="general">
          <h2>General season</h2>
          <p>
            Residents hunt Area {a.area} on a general deer license. Nonresidents need the Region {a.region}{" "}
            general license, which is drawn for the whole region and is good in the general seasons of{" "}
            {region?.generalAreas.length} areas.
          </p>
          <SeasonTable seasons={a.general} />
          {region && (
            <>
              <h3>
                <a href={regionPath(a.region)}>Region {a.region} general license</a>, {DEER_YEAR} draw
              </h3>
              <ul className="draws">
                <NonresidentDraws d={region.draws} />
              </ul>
            </>
          )}
        </section>
      )}

      {a.hunts.length > 0 && (
        <>
          <h2>Limited-quota licenses</h2>
          {a.hunts.map((h) => (
            <Hunt key={h.type} h={h} />
          ))}
        </>
      )}

      {!a.closed && a.general.length === 0 && a.hunts.length === 0 && (
        <p>
          No deer seasons are listed for this area in {DEER_YEAR}; the{" "}
          <a href="https://wgfd.wyo.gov/regulations">WGFD deer regulations</a> have the details.
        </p>
      )}

      {(a.general.length > 0 || a.hunts.some((h) => h.nrPoints)) && <OddsAssumptions year={DEER_YEAR} />}

      {!a.closed && <Outfitters where={`Area ${a.area}`} subject={`Outfitter listing: Deer Area ${a.area}`} />}

      {a.boundary && (
        <details className="boundary">
          <summary>Legal boundary description</summary>
          <p>{a.boundary}</p>
        </details>
      )}

      {near.length > 0 && (
        <>
          <h2>Nearby deer areas</h2>
          <ul className="nearby">
            {near.map((n) => (
              <li key={n.area}>
                <a href={deerPath(n)}>
                  Area {n.area}: {n.name}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <HowToRead />
    </main>
  );
}

function RegionPage({ r }: { r: DeerRegion }) {
  return (
    <main className="article wide">
      <nav className="crumbs">
        <a href="/">{SITE_NAME}</a> / <a href="/hunting/deer">Deer hunt areas</a> / Region {r.region}
      </nav>
      <h1>Deer Region {r.region}: nonresident general license</h1>
      <p className="lede">{regionHeadline(r)}</p>

      <HuntAreaMap
        areas={collection(r.areas.map((x) => areaFeature(x)))}
        markers={r.areas.map(marker)}
        bounds={unionBounds(r.areas)}
        highlight={r.areas.map((x) => x.area)}
        hrefFor="/hunting/deer/area-{area}"
      />

      <h2>{DEER_YEAR} draw</h2>
      <ul className="draws">
        <NonresidentDraws d={r.draws} />
      </ul>
      <OddsAssumptions year={DEER_YEAR} />

      <h2>Areas in Region {r.region}</h2>
      <div className="table-scroll">
        <table className="areas">
          <thead>
            <tr>
              <th>Area</th>
              <th>Name</th>
              <th>General season</th>
              <th>Legal deer</th>
            </tr>
          </thead>
          <tbody>
            {r.areas.map((a) => (
              <tr key={a.area}>
                <td>
                  <a href={deerPath(a)}>{a.area}</a>
                </td>
                <td>
                  <a href={deerPath(a)}>{a.name}</a>
                </td>
                <td>{a.closed ? "Closed" : a.general[0] ? seasonDates(a.general[0]) : "Draw only"}</td>
                <td>{a.general[0]?.limitations ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        The first general season row for each area; some areas have later seasons for white-tailed deer. Areas
        marked &ldquo;draw only&rdquo; have no general season, so a region license is not valid there.
      </p>

      <Outfitters where={`Region ${r.region}`} subject={`Outfitter listing: Deer Region ${r.region}`} />

      <h2>Other deer regions</h2>
      <ul className="nearby">
        {DEER_REGIONS.filter((o) => o.region !== r.region).map((o) => (
          <li key={o.region}>
            <a href={regionPath(o.region)}>Region {o.region}</a>
          </li>
        ))}
      </ul>

      <HowToRead />
    </main>
  );
}

export default function DeerPage({ params }: { params: { slug: string } }) {
  const page = getDeerPage(params.slug);
  if (!page) notFound();
  return "area" in page ? <AreaPage a={page.area} /> : <RegionPage r={page.region} />;
}
