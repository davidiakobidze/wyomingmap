import type { FeatureCollection } from "geojson";
import { License } from "@/lib/license";
import { Species } from "@/lib/points";
import { SITE_NAME, type Bounds } from "@/lib/site";
import DawnHero from "./DawnHero";
import HeroOdds from "./HeroOdds";
import { Crumbs } from "./Sheet";

// The top of an area or region sheet: dawn comes up over the place, its
// outline draws itself and the card lands on the reader's chance at its first
// license. The name and the plain-words answer are in the opening frame, so
// they are what a search engine and a reader with no script both get.
export default function AreaHero({
  species,
  focus,
  bbox,
  crumbs,
  kicker,
  name,
  answer,
  num,
  facts,
  license,
  none,
}: {
  species: Species;
  focus: FeatureCollection;
  bbox: Bounds;
  crumbs: { href?: string; label: string }[]; // after the site name
  kicker: string;
  name: string;
  answer: string;
  num: string; // "7", "G"
  facts: string; // under the name once the camera arrives
  license?: License;
  none: string; // the card when nothing was drawn
}) {
  return (
    <DawnHero
      focus={focus}
      bbox={bbox}
      start="near"
      contextUrl={`/data/${species}-hunt-areas.geojson`}
      length={240}
      place={name}
      copy={
        <>
          <Crumbs items={[{ href: "/", label: SITE_NAME }, ...crumbs]} />
          <div className="fl-kicker">{kicker}</div>
          <h1 className="area fl-rise">{name}</h1>
          <p className="fl-lede">{answer}</p>
        </>
      }
      tag={
        <>
          <div className="num">{num}</div>
          <div className="name">{name}</div>
          <p>{facts}</p>
        </>
      }
      card={
        license ? (
          <HeroOdds l={license} species={species} href="#licenses" cta="Every license and the draw" />
        ) : (
          <>
            <div className="k">No limited-quota draw</div>
            <div className="with">{none}</div>
            <a className="fl-btn" href="#details">
              Seasons and details <span aria-hidden="true">↓</span>
            </a>
          </>
        )
      }
    />
  );
}
