"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CombinedOdds,
  chanceAt,
  chanceBig,
  combinedOdds,
  firstChoiceChance,
  pointsKey,
  pointsLabel,
} from "@/lib/hunts";
import { Species, usePoints } from "@/lib/points";
import { License, demandOf } from "@/lib/license";
import DotDraw from "./DotDraw";

const num = new Intl.NumberFormat("en-US");
const plural = (n: number, w: string) => `${num.format(n)} ${w}${n === 1 ? "" : "s"}`;

// The lowest whole point count that was sure to draw on points, and the
// highest that was sure to miss.
function thresholds(o: CombinedOdds, k: { cut: number | null; sure: number | null }) {
  const firstSure = k.cut !== null ? Math.floor(k.cut) + 1 : k.sure !== null ? Math.ceil(k.sure) : null;
  const lastMiss = k.cut !== null ? (Number.isInteger(k.cut) ? k.cut - 1 : Math.floor(k.cut)) : firstSure !== null ? firstSure - 1 : null;
  return { firstSure, lastMiss };
}

function rowChance(l: License, pts: number): { c: number | null; at: string } {
  if (l.points) {
    const k = pointsKey(combinedOdds(l.points, l.random));
    return { c: k ? chanceAt(k, pts) : null, at: `${pts} pt${pts === 1 ? "" : "s"}` };
  }
  const d = demandOf(l);
  const c = firstChoiceChance(d?.d);
  return { c: c === null ? null : c / 100, at: d?.who === "Resident" ? "Residents" : "Random draw" };
}

export default function DrawBoard({
  species,
  year,
  where,
  licenses,
  map,
}: {
  species: Species;
  year: number;
  where: string; // "Area 7", "Region G"
  licenses: License[];
  map: React.ReactNode;
}) {
  const pts = usePoints(species);
  const [sel, setSel] = useState(0);
  const l = licenses[sel];

  return (
    <>
      {licenses.length > 1 && (
        <div className="hs-tickets" role="tablist" aria-label={`Licenses in ${where}`}>
          {licenses.map((x, i) => {
            const { c, at } = rowChance(x, pts);
            return (
              <button
                key={x.id}
                role="tab"
                aria-selected={i === sel}
                className={"hs-tk" + (i === sel ? " on" : "")}
                onClick={() => setSel(i)}
              >
                <span className="t">{x.kicker}</span>
                <span className="h">{x.title}</span>
                <span className="r">
                  <span>{at}</span>
                  <b>{c === null ? "—" : c >= 0.995 ? "Sure" : chanceBig(c)}</b>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="hs-main">
        <div>{map}</div>
        {l ? <Coupon l={l} pts={pts} species={species} year={year} /> : <NoCoupon where={where} year={year} />}
      </div>
      {l && <DotDraw key={l.id} l={l} pts={pts} year={year} where={where} />}
    </>
  );
}

function NoCoupon({ where, year }: { where: string; year: number }) {
  return (
    <aside className="hs-coupon">
      <div className="serial">
        <span>Draw coupon · {year}</span>
      </div>
      <div className="ctitle">No licenses drawn</div>
      <p className="ex">
        Wyoming Game and Fish drew no limited-quota licenses for {where} in {year}. Check the regulations for
        general seasons or closures.
      </p>
    </aside>
  );
}

function Coupon({ l, pts, species, year }: { l: License; pts: number; species: Species; year: number }) {
  const big = useRef<HTMLSpanElement>(null);
  const head = (
    <div className="serial">
      <span>
        Draw coupon · {l.points ? "NR" : (demandOf(l)?.who === "Resident" ? "Res" : "NR")} · {year}
      </span>
      <b>No. {l.serial}</b>
    </div>
  );
  const ctitle = (
    <div className="ctitle">
      {l.kicker} · {l.title}
    </div>
  );
  const resident = l.resident && l.points && (
    <div className="stub">
      <b>Residents</b>
      <span>
        {plural(l.resident.quota, "tag")} · {num.format(l.resident.first)} applied ·{" "}
        {chanceWords(firstChoiceChance(l.resident))}
      </span>
    </div>
  );
  const note = l.note && (
    <div className="stub">
      <b>Season</b>
      <span>{l.note}</span>
    </div>
  );

  const view = useMemo(() => {
    if (!l.points) return null;
    const o = combinedOdds(l.points, l.random);
    const k = pointsKey(o);
    return { o, k };
  }, [l]);

  const c = view?.k ? chanceAt(view.k, pts) : null;
  const text = chanceBig(c);
  useEffect(() => {
    if (!big.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    big.current.animate([{ transform: "translateY(8px)", opacity: 0.15 }, { transform: "none", opacity: 1 }], {
      duration: 280,
      easing: "cubic-bezier(.2,1.2,.4,1)",
    });
  }, [text]);

  if (!view) {
    const d = demandOf(l);
    if (!d) return null;
    const ch = firstChoiceChance(d.d);
    return (
      <aside className="hs-coupon">
        {head}
        {ctitle}
        <div className="csub">
          {d.who}, random draw · {plural(d.d.quota, "tag")} for {num.format(d.d.first)} first-choice applicants
        </div>
        <div className="read">
          <span className="n" ref={big}>
            {ch === null ? "—" : chanceBig(ch / 100)}
          </span>
          <span className="u">chance for a first-choice applicant. Points don&apos;t count in this draw.</span>
        </div>
        <div className="split">
          <div>
            <div className="k">Tags</div>
            <div className="v">{num.format(d.d.quota)}</div>
          </div>
          <div>
            <div className="k">First-choice applicants</div>
            <div className="v">{num.format(d.d.first)}</div>
          </div>
        </div>
        <div className="perf" />
        {note}
        {d.who === "Nonresident" && l.resident && (
          <div className="stub">
            <b>Residents</b>
            <span>
              {plural(l.resident.quota, "tag")} · {num.format(l.resident.first)} applied ·{" "}
              {chanceWords(firstChoiceChance(l.resident))}
            </span>
          </div>
        )}
      </aside>
    );
  }

  const { o, k } = view;
  const total = (l.points?.quota ?? 0) + (l.random?.quota ?? 0);
  const { firstSure, lastMiss } = k ? thresholds(o, k) : { firstSure: null, lastMiss: null };
  const lucky = Math.min(o.randomQuota, o.losers);
  const missed = o.rows.filter((x) => x.drew === 0).reduce((s, x) => s + x.applicants, 0);
  const atCut = k?.cut !== null && k?.cut === pts && o.cut;
  const sure = c !== null && c >= 0.995 && (o.losers === 0 || !(k?.cut === pts));

  let pd: string, ex: string;
  if (!k) {
    pd = "—";
    ex = "Nobody put this license first, so there are no odds to show.";
  } else if (o.losers === 0) {
    pd = "Everyone";
    ex = `All ${num.format(o.applicants)} nonresidents who put this first drew a tag in the point draw.`;
  } else if (sure) {
    pd = "Sure";
    ex = `Everyone with ${firstSure} or more points drew a tag in the point draw.`;
  } else if (atCut && o.cut) {
    pd = `${num.format(o.cut.drew)} of ${num.format(o.cut.applicants)}`;
    ex =
      `The point draw ran out at ${pointsLabel(o.cut.points)} points: ${num.format(o.cut.drew)} of ${num.format(o.cut.applicants)} drew. ` +
      `The other ${num.format(o.cut.applicants - o.cut.drew)} went into the random draw with everyone below, ` +
      (lucky ? `where ${num.format(lucky)} of ${num.format(o.losers)} drew.` : "which had no tags.");
  } else {
    pd = missed ? `0 of ${num.format(missed)}` : "None";
    const below =
      lastMiss !== null && lastMiss >= 0 && firstSure !== null
        ? `Nobody with ${lastMiss} points or fewer drew in the point draw.`
        : "Nobody drew in the point draw.";
    ex =
      `${below} All ${num.format(o.losers)} who missed went into the random draw, ` +
      (lucky ? `where ${num.format(lucky)} tags were drawn regardless of points.` : "which had no tags.");
  }

  const need =
    o.losers === 0
      ? "Everyone drew"
      : o.cut
        ? `${pointsLabel(o.cut.points)} got some · ${firstSure}+ all drew`
        : firstSure !== null
          ? `${firstSure}+ all drew`
          : "Nobody drew on points";

  return (
    <aside className="hs-coupon">
      {head}
      {ctitle}
      <div className="csub">
        Nonresident · {plural(total, "tag")} for {num.format(o.applicants)} first-choice applicants
      </div>
      <div className="read" aria-live="polite">
        <span className="n" ref={big}>
          {text}
        </span>
        <span className="u">
          chance with {pts} {species} point{pts === 1 ? "" : "s"}, both draws counted
        </span>
      </div>
      <div className="split">
        <div>
          <div className="k">Point draw · 75%</div>
          <div className="v">{pd}</div>
        </div>
        <div>
          <div className="k">Random draw · 25%</div>
          <div className="v">
            {o.losers === 0 ? "Not needed" : o.randomQuota ? `${num.format(lucky)} of ${num.format(o.losers)}` : "No tags"}
          </div>
        </div>
      </div>
      <p className="ex">{ex}</p>
      <div className="perf" />
      <div className="stub">
        <b>Points needed</b>
        <span>{need}</span>
      </div>
      {note}
      {resident}
    </aside>
  );
}

function chanceWords(c: number | null): string {
  if (c === null) return "no first choices";
  if (c >= 100) return "everyone drew";
  return c < 1 ? "under 1%" : `about ${Math.round(c)}%`;
}
