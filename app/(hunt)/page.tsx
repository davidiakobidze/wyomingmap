import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import AreaFinder, { FinderEntry } from "@/components/hunt/AreaFinder";
import DawnHero from "@/components/hunt/DawnHero";
import HeroOdds from "@/components/hunt/HeroOdds";
import HuntMap from "@/components/hunt/HuntMap";
import PointsDraw from "@/components/hunt/PointsDraw";
import ReachCards, { ReachRow } from "@/components/hunt/ReachCards";
import { DEER_AREAS, DEER_REGIONS, deerPath, herdNames, regionPath } from "@/lib/deer";
import { ELK_AREAS, ELK_YEAR, elkLicenses, elkPath } from "@/lib/elk";
import { areaFeature, collection, marker } from "@/lib/hunts";
import { HARVEST_SEASON } from "@/lib/harvest";
import { AreaOdds, oddsOf, sureFrom } from "@/lib/license";
import { website } from "@/lib/seo";
import { SITE_URL, WYOMING_BOUNDS } from "@/lib/site";

// The words people search for lead: "Wyoming hunting map", then what the map holds.
const title = `Wyoming Hunting Map · Elk and Deer Hunt Areas and Draw Odds, ${ELK_YEAR}`;
const description = `The Wyoming hunting map for elk and deer: all ${ELK_AREAS.length} elk and ${DEER_AREAS.length} deer hunt areas, their seasons, the preference points nonresidents needed in the ${ELK_YEAR} draw and your own chance at the points you hold, from Wyoming Game and Fish's reports.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: SITE_URL },
  openGraph: { title, description, url: SITE_URL },
};

// The area the homepage flies to and replays: a well-known, heavily applied-for
// any-elk draw with both a point draw and a random draw.
const SHOWCASE = 7;
const num = new Intl.NumberFormat("en-US");

export default function Home() {
  const show = ELK_AREAS.find((a) => a.area === SHOWCASE)!;
  const showLicense = elkLicenses(show)[0];

  const odds: Record<number, AreaOdds> = {};
  const reach: ReachRow[] = [];
  ELK_AREAS.forEach((a) => {
    const ls = elkLicenses(a);
    const first = ls[0] && oddsOf(ls[0]);
    if (first) odds[a.area] = first;
    // The cards name an area's own tags, so they skip the region general license.
    const l = ls.find((x) => x.id !== "general");
    const o = l ? oddsOf(l) : null;
    if (!l || !o) return;
    const need = sureFrom(o);
    if ("k" in o && need !== undefined)
      reach.push({ num: String(a.area), name: a.name, sub: `${a.herdName} herd · ${l.kicker}`, href: elkPath(a), odds: o, need });
  });

  const entries: FinderEntry[] = [
    ...ELK_AREAS.map((a) => ({
      key: `e${a.area}`,
      species: "Elk" as const,
      num: String(a.area),
      name: a.name,
      href: elkPath(a),
      sub: `${a.herdName} herd`,
    })),
    ...DEER_AREAS.map((a) => ({
      key: `d${a.area}`,
      species: "Deer" as const,
      num: String(a.area),
      name: a.name,
      href: deerPath(a),
      sub: [herdNames(a), `region ${a.region}`].filter(Boolean).join(" · "),
    })),
    ...DEER_REGIONS.map((r) => ({
      key: `r${r.region}`,
      species: "Deer" as const,
      num: r.region,
      name: `Region ${r.region} general license`,
      href: regionPath(r.region),
      sub: `${r.generalAreas.length} areas`,
    })),
  ];

  return (
    <>
      <JsonLd data={website} />
      <DawnHero
        focus={collection([areaFeature(show)])}
        bbox={show.bbox}
        start="state"
        contextUrl="/data/elk-hunt-areas.geojson"
        length={420}
        place={show.name}
        copy={
          <>
            <h1 className="fl-kicker">Wyoming hunting map · elk &amp; deer draw odds</h1>
            <p className="fl-headline fl-rise">
              Know your odds <em>before first light.</em>
            </p>
            <p className="fl-lede">
              All {ELK_AREAS.length} elk and {DEER_AREAS.length} deer hunt areas, the points that drew in {ELK_YEAR},
              and your own chance at the points you hold.
            </p>
          </>
        }
        tag={
          <>
            <div className="num">{show.area}</div>
            <div className="name">{show.name}</div>
            <p>
              Elk hunt area {show.area} · {show.herdName} herd · {num.format(show.sqMiles)} sq mi
            </p>
          </>
        }
        card={<HeroOdds l={showLicense} species="elk" href="#draw" cta="Watch the draw" />}
      />

      <main>
        <div className="fl-band">
          <div className="fl-wrap">
            <PointsDraw l={showLicense} species="elk" year={ELK_YEAR} where={`Area ${show.area}`} />
            <p className="fl-more">
              <a href={elkPath(show)}>Open the Area {show.area} sheet →</a>
            </p>
          </div>
        </div>

        <ReachCards rows={reach} />

        <section className="fl-band">
          <div className="fl-wrap">
            <div className="fl-eyebrow">Hunt finder · {ELK_YEAR} draw and {HARVEST_SEASON} harvest</div>
            <h2 className="fl-display fl-reveal">
              Draw the tag. <em>Fill it.</em>
            </h2>
            <p className="fl-sub">
              Every elk and deer license ranked for your own points: your chance to draw it, the share of its hunters
              who took an animal last season, and the two together.
            </p>
            <div className="fl-ctas">
              <a className="fl-btn" href="/hunting/elk/finder">
                Find an elk hunt
              </a>
              <a className="fl-btn ghost" href="/hunting/deer/finder">
                Find a deer hunt
              </a>
            </div>
          </div>
        </section>

        <section className="fl-band" id="find">
          <div className="fl-wrap">
            <div className="fl-eyebrow">The Wyoming hunt area map</div>
            <h2 className="fl-display fl-reveal">
              Find your <em>mountain.</em>
            </h2>
            <p className="fl-sub">
              Search any elk or deer area by number, name or herd, or pick one off the map: every elk hunt area in
              Wyoming is shaded by your chance at its main license.
            </p>
            <AreaFinder entries={entries} />
            <HuntMap
              species="elk"
              areasUrl="/data/elk-hunt-areas.geojson"
              labels={ELK_AREAS.map(marker)}
              bounds={WYOMING_BOUNDS}
              hrefFor="/hunting/elk/area-{area}"
              odds={odds}
              choropleth
            />
            <div className="fl-sheets">
              <a href="/hunting/elk">
                <span className="fl-eyebrow">Elk · {ELK_AREAS.length} areas</span>
                <b>Every elk area</b>
                <span>Sortable by your chance and by the points that made a tag sure.</span>
              </a>
              <a href="/hunting/deer">
                <span className="fl-eyebrow">
                  Deer · {DEER_AREAS.length} areas · {DEER_REGIONS.length} regions
                </span>
                <b>Every deer area</b>
                <span>General seasons by area and the nonresident region draws that open them.</span>
              </a>
            </div>
          </div>
        </section>

        <section className="fl-band">
          <div className="fl-wrap">
            <div className="fl-eyebrow">How the Wyoming draw works</div>
            <h2 className="fl-display fl-reveal">
              Points first. <em>Then luck.</em>
            </h2>
            <div className="fl-how">
              <div>
                <h3>Preference points</h3>
                <p>
                  Nonresidents build preference points over the years they don&apos;t draw. In the point draw,
                  licenses go to the applicants holding the most points first.
                </p>
              </div>
              <div>
                <h3>The 75/25 split</h3>
                <p>
                  Wyoming gives 75% of nonresident licenses to the point draw and 25% to a random draw among everyone
                  who missed it, so a hunter with few points still has a chance.
                </p>
              </div>
              <div>
                <h3>Residents</h3>
                <p>
                  Residents don&apos;t use points for elk or deer: their licenses are drawn at random. Most deer areas
                  also have a general season residents can hunt over the counter.
                </p>
              </div>
              <div>
                <h3>When to apply</h3>
                <p>
                  Applications open in early January. Nonresident elk closes around the start of February; deer,
                  antelope and resident elk close June 1. Wyoming Game and Fish posts{" "}
                  <a href="https://wgfd.wyo.gov/licenses-applications/application-dates-deadlines">each year&apos;s dates</a>.
                </p>
              </div>
              <div>
                <h3>General or drawn</h3>
                <p>
                  Many areas have a general season. Residents buy that license over the counter; nonresidents draw a
                  region general license (elk: Eastern, Southern or Western; deer: lettered regions) that covers them.
                </p>
              </div>
              <div>
                <h3>Hunt areas</h3>
                <p>
                  Every limited-quota license is good in one hunt area, or a few, for one season. Each area here has
                  its own page: seasons, legal animals, the points that drew and its legal boundary.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="fl-band fl-close">
          <div className="fl-wrap">
            <div className="fl-eyebrow">Nonresident elk applications open in January</div>
            <h2 className="fl-display fl-reveal">
              Pick the mountain. <em>Then apply.</em>
            </h2>
            <p className="fl-sub">
              Every area has its own sheet: the licenses, the points that drew, every applicant&apos;s draw and the
              areas around it.
            </p>
            <div className="fl-ctas">
              <a className="fl-btn" href="/hunting/elk">
                Browse elk areas
              </a>
              <a className="fl-btn ghost" href="/hunting/deer">
                Browse deer areas
              </a>
            </div>
          </div>
          <svg className="fl-ridge" viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true">
            <path fill="#2b1c2a" d="M0 170 L110 120 L190 150 L300 70 L380 120 L470 95 L560 150 L660 60 L760 130 L840 105 L930 160 L1040 80 L1130 135 L1220 110 L1330 155 L1440 120 V260 H0 Z" />
            <path fill="#120d14" d="M0 215 L140 175 L260 205 L390 150 L520 200 L640 170 L780 215 L900 165 L1030 205 L1160 175 L1300 210 L1440 180 V260 H0 Z" />
          </svg>
        </section>
      </main>
    </>
  );
}
