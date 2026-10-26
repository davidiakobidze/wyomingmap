import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HuntAreaMap from "@/components/HuntAreaMap";
import { Demand, NonresidentDraws, OddsAssumptions } from "@/components/HuntDraws";
import { ELK_AREAS, ELK_SOURCES, ELK_YEAR, ElkArea, ElkHunt, elkPath, elkSlug, getElkArea, mainHunt, neighbors } from "@/lib/elk";
import { areaFeature, collection, marker, nonresidentPhrase, oddsPhrase, sentences } from "@/lib/hunts";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

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
    <section className="hunt" id={`type-${h.type}`}>
      <h2>
        Type {h.type} · {h.description}
      </h2>
      <ul className="draws">
        <NonresidentDraws d={h} />
        {h.nrCowCalf && <Demand label="Nonresident" d={h.nrCowCalf} />}
        {h.resident && <Demand label="Resident" d={h.resident} />}
        {h.residentCowCalf && <Demand label="Resident" d={h.residentCowCalf} />}
      </ul>
    </section>
  );
}

export default function ElkAreaPage({ params }: { params: { area: string } }) {
  const a = getElkArea(params.area);
  if (!a) notFound();
  const near = neighbors(a);
  const shown = [a, ...near];
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Outfitter listing: Elk Area ${a.area}`
  )}&body=${encodeURIComponent("Outfitter name:\nWyoming outfitter license number:\nAreas you guide in:\nWebsite:\n")}`;

  return (
    <main className="article wide">
      <nav className="crumbs">
        <a href="/">{SITE_NAME}</a> / <a href="/hunting/elk">Elk hunt areas</a> / Area {a.area}
      </nav>
      <h1>
        Elk Hunt Area {a.area}: {a.name}
      </h1>
      <p className="lede">{headline(a)}</p>

      <HuntAreaMap
        areas={collection(shown.map((x) => areaFeature(x)))}
        markers={shown.map(marker)}
        bounds={a.bbox}
        highlight={a.area}
        hrefFor="/hunting/elk/area-{area}"
      />

      <dl className="facts">
        <div>
          <dt>Herd unit</dt>
          <dd>
            {a.herdName} ({a.herdUnit})
          </dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{num.format(a.sqMiles)} sq mi</dd>
        </div>
        <div>
          <dt>WGFD region</dt>
          <dd>{a.region}</dd>
        </div>
        <div>
          <dt>License types drawn</dt>
          <dd>{a.hunts.length || "none"}</dd>
        </div>
      </dl>

      {a.hunts.length === 0 ? (
        <p>
          Wyoming Game and Fish drew no limited-quota elk licenses for this area in {ELK_YEAR}. It may be
          hunted on a general license or closed to elk hunting; the{" "}
          <a href="https://wgfd.wyo.gov/regulations">WGFD elk regulations</a> say which.
        </p>
      ) : (
        a.hunts.map((h) => <Hunt key={h.type} h={h} />)
      )}
      {a.hunts.some((h) => h.nrPoints) && <OddsAssumptions year={ELK_YEAR} />}

      <aside className="callout">
        <h2>Outfitters licensed in Area {a.area}</h2>
        <p>
          Hunters reading this page are deciding where to apply. If you guide in Area {a.area}, you can be
          listed here with your name, a photo, and a link to your site.
        </p>
        <a className="button" href={mailto}>
          Get listed
        </a>
      </aside>

      {near.length > 0 && (
        <>
          <h2>Nearby elk areas</h2>
          <ul className="nearby">
            {near.map((n) => (
              <li key={n.area}>
                <a href={elkPath(n)}>
                  Area {n.area}: {n.name}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>How to read this</h2>
      <p>
        Odds are what happened in the {ELK_YEAR} draw, published by Wyoming Game and Fish. They are not a
        forecast; quotas and applicant numbers change every year. A nonresident&apos;s chance counts both the
        preference-point draw and the random draw that everyone who misses it goes into; WGFD&apos;s own tables
        show only the first, so they understate it. Resident and cow/calf draws are random: the percentage shown
        is licenses divided by first-choice applicants, before second and third choices.
      </p>
      <p className="fine">
        Sources: <a href={ELK_SOURCES.odds}>WGFD draw results and odds</a> ({ELK_YEAR}) and the{" "}
        <a href={ELK_SOURCES.boundaries}>WGFD elk hunt area boundaries</a>. Boundaries are for general location,
        not a survey. Check season dates and boundary descriptions in the WGFD regulations before you hunt.
      </p>
    </main>
  );
}
