import type { Metadata } from "next";
import { Crumbs } from "@/components/hunt/Sheet";
import { DEER_SOURCES, DEER_YEAR } from "@/lib/deer";
import { ELK_SOURCES, ELK_YEAR } from "@/lib/elk";
import { HARVEST_SEASON } from "@/lib/harvest";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "../info.css";

const title = "About";
const description =
  "Where Wyoming Map's elk and deer draw odds come from, how they are worked out, what they can't tell you, and how the site is paid for.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title: `${title} · ${SITE_NAME}`, description, url: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <main className="hs-wrap in-page">
      <Crumbs items={[{ href: "/", label: SITE_NAME }, { label: title }]} />
      <div className="hs-head">
        <h1>About {SITE_NAME}</h1>
        <p className="answer">
          Wyoming elk and deer draw odds by hunt area, worked out for your own preference points, so you can decide
          where to apply without reading through the state&apos;s reports yourself.
        </p>
      </div>

      <div className="in-body">
        {/* TODO(owner): say who runs the site here, by name or business, if you want that public. */}
        <h2>Who runs it</h2>
        <p>
          {SITE_NAME} is an independent site. It isn&apos;t run by, affiliated with or endorsed by the Wyoming Game and
          Fish Department or the State of Wyoming, and you can&apos;t apply for a license here. Applications go through
          Game and Fish.
        </p>

        <h2>Where the numbers come from</h2>
        <ul>
          <li>
            <b>Draw results:</b> Game and Fish&apos;s published <a href={ELK_SOURCES.odds}>{ELK_YEAR} elk</a> and{" "}
            <a href={DEER_SOURCES.odds}>{DEER_YEAR} deer</a> draw reports.
          </li>
          <li>
            <b>Hunter success:</b> Game and Fish&apos;s annual harvest reports, currently the {HARVEST_SEASON} season.
          </li>
          <li>
            <b>Seasons and boundaries:</b> Game and Fish&apos;s season regulations and hunt-area map layers.
          </li>
          <li>
            <b>Maps:</b> terrain from AWS Terrain Tiles and base maps from OpenStreetMap contributors.
          </li>
        </ul>
        <p>
          Draw reports come out each spring and harvest reports each February. We rebuild the pages from the new reports
          after that, so a page can lag behind a report that has only just come out.
        </p>

        <h2>How the odds are worked out</h2>
        <p>
          For a nonresident, your chance combines two draws: what happened at your point level in the preference-point
          draw, plus your chance in the random draw if you miss it. For a resident, it compares licenses with first-choice
          applicants. The hunt finder then multiplies your draw chance by that hunt&apos;s hunter success rate. Each odds
          table has a &ldquo;What these odds assume&rdquo; note with the details.
        </p>

        <h2>What they can&apos;t tell you</h2>
        <p>
          These numbers describe the last draw, not the next one. Quotas, applicant numbers and rules change each year.
          Treat them as a guide to where you stand, and check licenses, dates and rules with{" "}
          <a href="https://wgfd.wyo.gov">Wyoming Game and Fish</a> before you apply.
        </p>

        <h2>How the site is paid for</h2>
        <p>
          The odds and the finder are free. The site earns money from outfitter listings: licensed Wyoming outfitters pay
          to appear on the pages for the areas they guide in. Listings sit in their own section, in alphabetical order,
          and play no part in the odds, the success figures or the finder&apos;s rankings. A listing isn&apos;t an
          endorsement, so check any outfitter&apos;s license with the{" "}
          <a href="https://outfitters.wyo.gov/outfitters">State Board of Outfitters</a> before you book.
        </p>

        <h2>Your data</h2>
        <p>
          Your preference points are saved in your own browser. The <a href="/privacy">privacy page</a> covers this and
          the rest of what we collect. If you spot a wrong number, <a href="/contact">please tell us</a>.
        </p>
      </div>
    </main>
  );
}
