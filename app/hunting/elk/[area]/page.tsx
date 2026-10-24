import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HuntAreaMap from "@/components/HuntAreaMap";
import {
  DemandDraw,
  ELK_AREAS,
  ELK_SOURCES,
  ELK_YEAR,
  ElkArea,
  ElkHunt,
  PointsDraw,
  areaFeature,
  chanceLabel,
  collection,
  elkPath,
  elkSlug,
  firstChoiceChance,
  getElkArea,
  labelPoint,
  mainHunt,
  neighbors,
  pointsLabel,
  pointsNeeded,
  pointsSentence,
} from "@/lib/elk";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return ELK_AREAS.map((a) => ({ area: elkSlug(a) }));
}

const num = new Intl.NumberFormat("en-US");

function oddsPhrase(who: "resident" | "nonresident", d: DemandDraw): string {
  const c = firstChoiceChance(d);
  if (c === null) return `no ${who} applied for it as a first choice`;
  if (c >= 100) return `there were enough licenses for every ${who} who put it first`;
  return `${who}s' first-choice odds were ${chanceLabel(c)}`;
}

// The two numbers people search for, in one line: what a nonresident needs in
// points and what a resident's odds were, for the area's main any-elk hunt.
function headline(a: ElkArea): string {
  const h = mainHunt(a);
  if (!h) return `No limited-quota elk licenses were drawn for Area ${a.area} in ${ELK_YEAR}.`;
  const parts: string[] = [];
  if (h.nrPoints) {
    const need = pointsNeeded(h.nrPoints);
    parts.push(
      need === null
        ? "nonresidents drew with any number of preference points"
        : `nonresidents needed about ${Math.ceil(need)} preference points`
    );
  } else if (h.nrCowCalf) {
    parts.push(oddsPhrase("nonresident", h.nrCowCalf));
  }
  const res = h.resident ?? h.residentCowCalf;
  if (res) parts.push(oddsPhrase("resident", res));
  if (parts.length === 0) return `Area ${a.area} had a Type ${h.type} license in the ${ELK_YEAR} draw.`;
  return `In the ${ELK_YEAR} draw for the Type ${h.type} ${h.description.toLowerCase()} license, ${parts.join(", and ")}.`;
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

function PointsTable({ d }: { d: PointsDraw }) {
  const rows = d.rows.filter((r) => r.applicants > 0);
  if (rows.length === 0) return null;
  return (
    <table className="odds">
      <thead>
        <tr>
          <th>Points</th>
          <th>First-choice applicants</th>
          <th>Odds</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.odds >= 100 ? "sure" : r.odds > 0 ? "partial" : "none"}>
            <td>{pointsLabel(r.points)}</td>
            <td>{num.format(r.applicants)}</td>
            <td>{r.odds % 1 === 0 ? r.odds.toFixed(0) : r.odds.toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Demand({ label, d }: { label: string; d: DemandDraw }) {
  return (
    <li>
      <strong>{label}:</strong> {num.format(d.quota)} licenses, {num.format(d.first)} first-choice applicants
      {d.first > 0 && <> ({chanceLabel(firstChoiceChance(d))})</>}.
    </li>
  );
}

function Points({ label, d }: { label: string; d: PointsDraw }) {
  return (
    <>
      <li>
        <strong>{label}:</strong> {num.format(d.quota)} licenses. {pointsSentence(d)}
      </li>
      {d.summary.applicants > 0 && !d.summary.allDrew && (
        <li className="table-item">
          <details>
            <summary>Point-by-point results</summary>
            <PointsTable d={d} />
          </details>
        </li>
      )}
    </>
  );
}

function Hunt({ h }: { h: ElkHunt }) {
  return (
    <section className="hunt" id={`type-${h.type}`}>
      <h2>
        Type {h.type} · {h.description}
      </h2>
      <ul className="draws">
        {h.nrPoints && <Points label="Nonresident, preference-point draw" d={h.nrPoints} />}
        {h.nrRandom && <Demand label="Nonresident, random draw" d={h.nrRandom} />}
        {h.nrSpecialPoints && <Points label="Nonresident special, preference-point draw" d={h.nrSpecialPoints} />}
        {h.nrSpecialRandom && <Demand label="Nonresident special, random draw" d={h.nrSpecialRandom} />}
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
        markers={shown.map((x) => ({ area: x.area, name: x.name, ...labelPoint(x) }))}
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
        forecast; quotas and applicant numbers change every year. Preference-point odds are WGFD&apos;s own
        figures. For random and resident draws WGFD publishes licenses and applicant counts, so the percentage
        shown is the share of first-choice applicants there were licenses for, before second and third choices.
        Rows marked &ldquo;just under&rdquo; a number are applicants between two point levels, which happens when
        a party applies together and its points are averaged.
      </p>
      <p className="fine">
        Sources: <a href={ELK_SOURCES.odds}>WGFD draw results and odds</a> ({ELK_YEAR}) and the{" "}
        <a href={ELK_SOURCES.boundaries}>WGFD elk hunt area boundaries</a>. Boundaries are for general location,
        not a survey. Check season dates and boundary descriptions in the WGFD regulations before you hunt.
      </p>
    </main>
  );
}
