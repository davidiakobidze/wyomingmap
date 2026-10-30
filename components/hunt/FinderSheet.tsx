import JsonLd from "@/components/JsonLd";
import HuntFinder from "@/components/hunt/HuntFinder";
import { Collar } from "@/components/hunt/Sheet";
import { DEER_SOURCES, DEER_YEAR } from "@/lib/deer";
import { ELK_SOURCES, ELK_YEAR } from "@/lib/elk";
import { finderPath, finderRows } from "@/lib/finder";
import { DEER_HARVEST_SOURCE, ELK_HARVEST_SOURCE, HARVEST_SEASON } from "@/lib/harvest";
import type { Species } from "@/lib/points";
import { breadcrumbs } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export function finderMeta(species: Species) {
  const year = species === "elk" ? ELK_YEAR : DEER_YEAR;
  const title = `Wyoming ${species} hunt finder: the tags you can draw, ranked by ${HARVEST_SEASON} hunter success`;
  const description =
    `Every Wyoming ${species} license ranked for your own preference points: your chance in the ${year} draw, ` +
    `the ${HARVEST_SEASON} hunter success rate and days per animal, and the odds of drawing and filling the tag. ` +
    `Free, from Wyoming Game and Fish's draw and harvest reports.`;
  return { title, description, path: finderPath(species) };
}

// The finder sheet: one species' licenses, all at once, for the hunter's own points.
export default function FinderSheet({ species }: { species: Species }) {
  const year = species === "elk" ? ELK_YEAR : DEER_YEAR;
  const rows = finderRows(species);
  const other: Species = species === "elk" ? "deer" : "elk";
  const odds = species === "elk" ? ELK_SOURCES.odds : DEER_SOURCES.odds;
  const harvest = species === "elk" ? ELK_HARVEST_SOURCE : DEER_HARVEST_SOURCE;
  const Species = species === "elk" ? "Elk" : "Deer";

  return (
    <>
      <JsonLd
        data={breadcrumbs([
          { href: "/", label: SITE_NAME },
          { href: `/hunting/${species}`, label: `${Species} hunt areas` },
          { label: "Hunt finder" },
        ])}
      />
      <Collar year={year}>
        <b>Wyoming {species}</b> · hunt finder · {year} draw, {HARVEST_SEASON} harvest
      </Collar>
      <main className="hs-wrap">
        <div className="hs-head">
          <div>
            <h1>
              <span className="kicker">{Species} hunt finder</span>
              The {species} tags you can draw, ranked
            </h1>
            <p className="answer">
              Every Wyoming {species} license at your own points: your chance in the {year} draw, how its hunters did
              in {HARVEST_SEASON}, and the two together, your odds of drawing the tag and filling it. Set your{" "}
              {species} points at the top of the page.
            </p>
          </div>
          <a className="hs-btn" href={finderPath(other)}>
            {other === "elk" ? "Elk" : "Deer"} finder
          </a>
        </div>

        <HuntFinder species={species} rows={rows} season={HARVEST_SEASON} year={year} />

        <section className="hs-sec hs-read">
          <div className="sh">
            <h2>How to read this</h2>
          </div>
          <p>
            <b>Draw</b> is what your point count would have given you in the {year} draw: for nonresidents the
            preference-point draw and the random draw everyone who misses it goes into; for residents, licenses over
            first-choice applicants. Residents buy general licenses over the counter, so those rows are sure.
          </p>
          <p>
            <b>Success</b> is the share of active hunters on that license who took {species === "elk" ? "an elk" : "a deer"}{" "}
            in {HARVEST_SEASON}, from WGFD&apos;s harvest survey. On a nonresident region general license it is the
            region&apos;s nonresident general-license hunters; on an area&apos;s general season, everyone who hunted it.
            {species === "deer" && " Deer licenses show the deer most of their hunters went after."}
          </p>
          <p>
            <b>Draw and fill</b> multiplies the two: out of every hundred hunters at your points who put in for it,
            about how many would have had the tag and an animal. Both are last year&apos;s results, not a forecast;
            quotas, applicants and weather change every year.
          </p>
          <p className="fine">
            Sources: <a href={odds}>WGFD draw results and odds</a> ({year}) and the{" "}
            <a href={harvest}>WGFD {HARVEST_SEASON} {species} harvest report</a>. Check the current regulations before
            you apply.
          </p>
        </section>
      </main>
    </>
  );
}
