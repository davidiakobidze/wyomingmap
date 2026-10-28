"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CombinedOdds,
  DemandDraw,
  chanceAt,
  combinedOdds,
  firstChoiceChance,
  pointsKey,
  pointsLabel,
  pointsValue,
} from "@/lib/hunts";
import { Species, usePoints } from "@/lib/points";
import { License, demandOf } from "@/lib/license";

const num = new Intl.NumberFormat("en-US");
const plural = (n: number, w: string) => `${num.format(n)} ${w}${n === 1 ? "" : "s"}`;

// The big number: "Sure", "35%", "1 in 44".
function bigChance(c: number | null): string {
  if (c === null) return "—";
  if (c >= 0.995) return "Sure";
  if (c <= 0) return "None";
  if (c >= 0.1) return `${Math.round(c * 100)}%`;
  const n = Math.round(1 / c);
  return n > 1000 ? "<1 in 1,000" : `1 in ${num.format(n)}`;
}

// Point levels in a narrow column: "14", "under 15", "3 or fewer".
const shortPoints = (label: string) =>
  label.startsWith("<=") ? `${label.replace(/[<=\s]/g, "")} or fewer` : label.startsWith("<") ? `under ${label.replace(/[<\s]/g, "")}` : label;

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
                  <b>{c === null ? "—" : c >= 0.995 ? "Sure" : bigChance(c)}</b>
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
      {l && <Ladder key={l.id} l={l} pts={pts} year={year} where={where} />}
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
  const text = bigChance(c);
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
            {ch === null ? "—" : bigChance(ch / 100)}
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

interface LadderRow {
  label: string;
  lo: number;
  hi: number;
  applicants: number;
  drew: number;
}

// One dot per applicant, a row per point level, with the line where the
// point draw ran out and a random draw the reader can run again.
function Ladder({ l, pts, year, where }: { l: License; pts: number; year: number; where: string }) {
  const model = useMemo(() => {
    let rows: LadderRow[];
    let losers: number, randomTags: number, who: string, d: DemandDraw | undefined;
    if (l.points) {
      const o = combinedOdds(l.points, l.random);
      const lastDrew = o.rows.reduce((i, x, j) => (x.drew > 0 ? j : i), -1);
      const top = o.rows.slice(0, lastDrew + 1).map((x) => {
        const v = pointsValue(x.points);
        return { label: shortPoints(x.points), lo: v, hi: v, applicants: x.applicants, drew: x.drew };
      });
      const rest = o.rows.slice(lastDrew + 1);
      if (rest.length) {
        const hi = pointsValue(rest[0].points);
        const lo = pointsValue(rest[rest.length - 1].points);
        top.push({
          label: rest.length === 1 ? shortPoints(rest[0].points) : `${Math.max(0, Math.ceil(lo))}–${Math.floor(hi)}`,
          lo: rest.length === 1 ? lo : Math.min(lo, 0),
          hi,
          applicants: rest.reduce((s, x) => s + x.applicants, 0),
          drew: 0,
        });
      }
      rows = top;
      losers = o.losers;
      randomTags = Math.min(o.randomQuota, o.losers);
      who = "nonresident";
      return { rows, losers, randomTags, who, cutAt: rest.length && o.losers ? top.length - 1 : -1, random: true };
    }
    const dm = demandOf(l);
    d = dm?.d;
    if (!d || d.first === 0) return null;
    rows = [{ label: "any points", lo: -1, hi: 99, applicants: d.first, drew: 0 }];
    return {
      rows,
      losers: d.first,
      randomTags: Math.min(d.quota, d.first),
      who: dm!.who.toLowerCase(),
      cutAt: -1,
      random: true,
    };
  }, [l]);

  const total = model ? model.rows.reduce((s, r) => s + r.applicants, 0) : 0;
  const per = total > 1500 ? Math.ceil(total / 1000) : 1;
  const dots = useMemo(() => {
    if (!model) return [];
    return model.rows.map((r) => ({
      n: Math.max(1, Math.round(r.applicants / per)),
      drew: Math.round(r.drew / per),
    }));
  }, [model, per]);
  const loserSlots = dots.reduce((s, r) => s + r.n - r.drew, 0);
  const winners = model ? Math.min(loserSlots, Math.max(model.randomTags ? 1 : 0, Math.round(model.randomTags / per))) : 0;

  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const draw = () => {
    const idx = Array.from({ length: loserSlots }, (_, i) => i);
    for (let i = 0; i < winners; i++) {
      const j = i + Math.floor(Math.random() * (idx.length - i));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    setPicked(new Set(idx.slice(0, winners)));
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px 120px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(draw, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  if (!model) return null;
  let k = 0; // dot index, for the pop-in stagger
  let loser = 0; // index among dots that missed the point draw
  const isPoints = !!l.points;

  return (
    <section className="hs-sec">
      <div className="sh">
        <h2>Every applicant in the {year} draw</h2>
        <div className="sh-side">
          <p>
            One dot per {per > 1 ? `${per} ` : ""}
            {model.who} {per > 1 ? "applicants" : "applicant"} who put {where} {l.kicker} first.{" "}
            {isPoints ? "Black drew on points; purple won the random draw." : "Purple won the random draw."}
          </p>
          {winners > 0 && (
            <button type="button" className="hs-btn" onClick={draw}>
              Run the draw again
            </button>
          )}
        </div>
      </div>
      <div className={"hs-ladder" + (shown ? " in" : "")} ref={ref}>
        {model.rows.map((r, i) => {
          const you = isPoints && pts >= r.lo && pts <= r.hi && (r.lo === r.hi ? pts === r.lo : true);
          return (
            <Row key={i} cut={i === model.cutAt ? model : null}>
              <div className={"lv" + (you ? " you" : "")}>{isPoints ? `${r.label} pts` : r.label}</div>
              <div className="dots">
                {Array.from({ length: dots[i].n }, (_, j) => {
                  const pt = j < dots[i].drew;
                  const rd = !pt && picked.has(loser++);
                  return <i key={j} className={"d" + (pt ? " pt" : rd ? " rd" : "")} style={{ "--i": Math.min(k++, 1000) } as React.CSSProperties} />;
                })}
              </div>
              <div className="lr">
                {isPoints ? `${num.format(r.drew)} of ${num.format(r.applicants)} drew` : `${num.format(model.randomTags)} of ${num.format(r.applicants)} drew`}
              </div>
            </Row>
          );
        })}
      </div>
      <div className="hs-key">
        {isPoints && <span className="k1">Drew in the point draw</span>}
        <span className="k2">Drew in the random draw</span>
        <span>Went home empty</span>
      </div>
    </section>
  );
}

function Row({ cut, children }: { cut: { losers: number; randomTags: number } | null; children: React.ReactNode }) {
  return (
    <>
      {cut && (
        <div className="cut">
          Point draw ran out · {num.format(cut.losers)} go to the random draw for {plural(cut.randomTags, "tag")}
        </div>
      )}
      {children}
    </>
  );
}
