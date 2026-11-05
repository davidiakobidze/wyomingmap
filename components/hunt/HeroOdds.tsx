"use client";

import { chanceAt, chanceBig, combinedOdds, firstChoiceChance, pointsKey } from "@/lib/hunts";
import { License, demandOf, oddsOf, sureFrom } from "@/lib/license";
import { Species, usePoints } from "@/lib/points";

const num = new Intl.NumberFormat("en-US");

// The hero's card: one license, the hunter's own chance at it. `where` names the
// area on pages that aren't already about it, so the number never stands alone.
export default function HeroOdds({
  l,
  species,
  href,
  cta,
  where,
}: {
  l: License;
  species: Species;
  href: string;
  cta: string;
  where?: string;
}) {
  const pts = usePoints(species);
  let big: string, with_: string, tags: number, applied: number, who: string;
  if (l.points) {
    const o = combinedOdds(l.points, l.random);
    const k = pointsKey(o);
    big = chanceBig(k ? chanceAt(k, pts) : null);
    with_ = `your chance with ${pts} ${species} point${pts === 1 ? "" : "s"}, both draws counted`;
    tags = l.points.quota + (l.random?.quota ?? 0);
    applied = o.applicants;
    who = "Nonresident";
  } else {
    const d = demandOf(l);
    const c = firstChoiceChance(d?.d);
    big = chanceBig(c === null ? null : c / 100);
    with_ = "chance for a first-choice applicant; points don't count in this draw";
    tags = d?.d.quota ?? 0;
    applied = d?.d.first ?? 0;
    who = d?.who ?? "Nonresident";
  }
  const sure = sureFrom(oddsOf(l));

  return (
    <>
      <div className="k">
        {where && `${where} · `}
        {l.kicker} · {l.title} · {who.toLowerCase()}
      </div>
      <div className="big" aria-live="polite">
        {big}
      </div>
      <div className="with">{with_}</div>
      <dl>
        <div>
          <dt>Tags</dt>
          <dd>{num.format(tags)}</dd>
        </div>
        <div>
          <dt>Applied</dt>
          <dd>{num.format(applied)}</dd>
        </div>
        {l.points ? (
          <div>
            <dt>Sure at</dt>
            <dd>{sure === undefined ? "—" : sure === 0 ? "Any" : `${sure} pt${sure === 1 ? "" : "s"}`}</dd>
          </div>
        ) : (
          <div>
            <dt>Draw</dt>
            <dd>Random</dd>
          </div>
        )}
      </dl>
      <a className="fl-btn" href={href}>
        {cta} <span aria-hidden="true">↓</span>
      </a>
    </>
  );
}
