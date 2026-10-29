"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { chanceAt, chanceBig, combinedOdds, firstChoiceChance, pointsKey, pointsValue } from "@/lib/hunts";
import { License, demandOf } from "@/lib/license";

const num = new Intl.NumberFormat("en-US");
const plural = (n: number, w: string) => `${num.format(n)} ${w}${n === 1 ? "" : "s"}`;

// Point levels in a narrow column: "14", "under 15", "3 or fewer".
const shortPoints = (label: string) =>
  label.startsWith("<=")
    ? `${label.replace(/[<=\s]/g, "")} or fewer`
    : label.startsWith("<")
      ? `under ${label.replace(/[<\s]/g, "")}`
      : label;
const ptsLabel = (label: string) => (label === "1" ? "1 pt" : `${shortPoints(label)} pts`);

interface Row {
  label: string;
  lo: number;
  hi: number;
  applicants: number;
  drew: number;
}

interface Model {
  rows: Row[];
  randomTags: number;
  losers: number;
  who: string;
  cutAt: number; // row the "points ran out" line sits above, or -1
  points: boolean;
  chance: (p: number) => number | null;
}

// The draw as rows of applicants: every point level that drew anyone, then
// everyone below lumped into one row.
function modelOf(l: License): Model | null {
  if (l.points) {
    const o = combinedOdds(l.points, l.random);
    const k = pointsKey(o);
    const lastDrew = o.rows.reduce((i, x, j) => (x.drew > 0 ? j : i), -1);
    const rows: Row[] = o.rows.slice(0, lastDrew + 1).map((x) => {
      const v = pointsValue(x.points);
      return { label: ptsLabel(x.points), lo: v, hi: v, applicants: x.applicants, drew: x.drew };
    });
    const rest = o.rows.slice(lastDrew + 1);
    if (rest.length) {
      const hi = pointsValue(rest[0].points);
      const lo = pointsValue(rest[rest.length - 1].points);
      rows.push({
        label: rest.length === 1 ? ptsLabel(rest[0].points) : `${Math.max(0, Math.ceil(lo))}–${Math.floor(hi)} pts`,
        lo: rest.length === 1 ? lo : Math.min(lo, 0),
        hi,
        applicants: rest.reduce((s, x) => s + x.applicants, 0),
        drew: 0,
      });
    }
    return {
      rows,
      randomTags: Math.min(o.randomQuota, o.losers),
      losers: o.losers,
      who: "nonresident",
      cutAt: rest.length && o.losers ? rows.length - 1 : -1,
      points: true,
      chance: (p) => (k ? chanceAt(k, p) : null),
    };
  }
  const dm = demandOf(l);
  if (!dm || dm.d.first === 0) return null;
  const c = firstChoiceChance(dm.d);
  return {
    rows: [{ label: "everyone", lo: -1, hi: 99, applicants: dm.d.first, drew: 0 }],
    randomTags: Math.min(dm.d.quota, dm.d.first),
    losers: dm.d.first,
    who: dm.who.toLowerCase(),
    cutAt: -1,
    points: false,
    chance: () => (c === null ? null : c / 100),
  };
}

const shuffle = <T,>(a: T[]): T[] => gsap.utils.shuffle(a.slice());

// Every applicant as a dot. They rain in, the point draw lights its winners
// top down, the random draw flickers across everyone left and settles on its
// winners, and the ringed dot is the reader, at their own points.
export default function DotDraw({
  l,
  pts,
  year,
  where,
  title,
}: {
  l: License;
  pts: number;
  year: number;
  where: string; // "Area 7"
  title?: React.ReactNode;
}) {
  const model = useMemo(() => modelOf(l), [l]);
  const total = model ? model.rows.reduce((s, r) => s + r.applicants, 0) : 0;
  // Past 1,500 applicants, a dot stands for several.
  const per = total > 1500 ? Math.ceil(total / 1000) : 1;
  const layout = useMemo(() => {
    if (!model) return [];
    return model.rows.map((r) => ({ n: Math.max(1, Math.round(r.applicants / per)), drew: Math.round(r.drew / per) }));
  }, [model, per]);
  const mine = model ? (model.points ? model.rows.findIndex((r) => pts >= r.lo && pts <= r.hi) : 0) : -1;
  const meRow = mine === -1 && model?.points ? model.rows.length - 1 : mine;

  // The draw finishes seconds after it starts; it should report the points held then.
  const ptsNow = useRef(pts);
  ptsNow.current = pts;
  const box = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const shown = useRef(false);
  const [result, setResult] = useState<React.ReactNode>(null);

  const run = () => {
    const el = box.current;
    if (!el || !model) return;
    tl.current?.kill();
    const dots = Array.from(el.querySelectorAll<HTMLElement>(".d"));
    dots.forEach((d) => d.classList.remove("pt", "rd", "flick"));
    const cut = el.querySelector(".fl-cut");
    // Point draw: each row's winners; the row where points ran out is a lottery of its own.
    const winners: number[] = [];
    layout.forEach((r, ri) => {
      const idx = dots.map((d, i) => (Number(d.dataset.row) === ri ? i : -1)).filter((i) => i >= 0);
      winners.push(...shuffle(idx).slice(0, r.drew));
    });
    const won = new Set(winners);
    const losers = dots.map((_, i) => i).filter((i) => !won.has(i));
    const lucky = shuffle(losers).slice(0, Math.min(losers.length, Math.max(model.randomTags ? 1 : 0, Math.round(model.randomTags / per))));
    const me = dots.findIndex((d) => d.dataset.me === "1");
    const done = () => {
      const pts = ptsNow.current;
      const c = model.chance(pts);
      const at = model.points ? ` at ${pts} point${pts === 1 ? "" : "s"}` : "";
      const odds = c === null ? "" : c >= 0.995 ? `A sure tag${at}.` : `${chanceBig(c)} is your chance${at}.`;
      if (won.has(me)) setResult(<><b>You drew on points.</b> {odds}</>);
      else if (lucky.includes(me)) setResult(<><b>You won the random draw.</b> {odds} Run it again to see how often.</>);
      else setResult(<>You went home empty this time. <b>{odds}</b></>);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      winners.forEach((i) => dots[i].classList.add("pt"));
      lucky.forEach((i) => dots[i].classList.add("rd"));
      if (cut) (cut as HTMLElement).style.opacity = "1";
      done();
      return;
    }
    setResult(null);
    const t = gsap.timeline();
    if (cut) gsap.set(cut, { opacity: 0 });
    const step = Math.min(0.022, 1.4 / Math.max(1, winners.length));
    winners.forEach((i, n) => t.call(() => dots[i].classList.add("pt"), undefined, n * step));
    if (cut) t.to(cut, { opacity: 1, duration: 0.4 });
    let flicked: number[] = [];
    for (let n = 0; n < 14; n++) {
      t.call(() => {
        flicked.forEach((i) => dots[i].classList.remove("flick"));
        flicked = shuffle(losers).slice(0, Math.min(40, losers.length));
        flicked.forEach((i) => dots[i].classList.add("flick"));
      }, undefined, `+=${n === 0 ? 0.1 : 0.09}`);
    }
    t.call(() => flicked.forEach((i) => dots[i].classList.remove("flick")), undefined, "+=0.09");
    const settle = Math.min(0.06, 1.5 / Math.max(1, lucky.length));
    lucky.forEach((i) => t.call(() => dots[i].classList.add("rd"), undefined, `+=${settle}`));
    t.call(done, undefined, "+=0.3");
    tl.current = t;
  };

  // Rain the dots in when the section arrives, then run the draw once on its own.
  useEffect(() => {
    const el = box.current;
    if (!el || !model) return;
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      run();
      return;
    }
    const dots = el.querySelectorAll(".d");
    gsap.set(dots, { autoAlpha: 0, y: -30 });
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      once: true,
      onEnter: () => {
        shown.current = true;
        gsap.to(dots, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: { each: Math.min(0.0012, 1.2 / dots.length) },
          onComplete: run,
        });
      },
    });
    return () => {
      st.kill();
      tl.current?.kill();
    };
    // Runs once per license; `run` reads the latest points when it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // New points move the ringed dot; the old result no longer applies.
  useEffect(() => {
    if (shown.current) setResult(<>Run the draw again at {pts} point{pts === 1 ? "" : "s"}.</>);
  }, [pts]);

  if (!model) return null;
  // A region's general license is good in many areas; name it, not the area.
  const what = l.kicker.startsWith("Region") ? `the ${l.kicker} ${l.title.toLowerCase()}` : `${where} ${l.kicker}`;
  const meAt = Math.floor((layout[meRow]?.n ?? 1) / 2);

  return (
    <section className="fl-draw" id="draw">
      <div className="fl-draw-head">
        <div>
          <div className="fl-eyebrow">The {year} draw, replayed</div>
          <h2 className="fl-display fl-reveal">
            {title ?? (
              <>
                {num.format(total)} {model.who}s wanted {what}.{" "}
                <em>{num.format(model.points ? model.rows.reduce((s, r) => s + r.drew, 0) + model.randomTags : model.randomTags)}</em> drew.
              </>
            )}
          </h2>
          <p className="fl-sub">
            One dot per {per > 1 ? `${per} ${model.who}s` : model.who} who put {what} first.{" "}
            {model.points
              ? "Most tags go to the most points; the rest are drawn at random from everyone left."
              : "Every tag is drawn at random; points don't count."}{" "}
            The ringed dot is you.
          </p>
        </div>
        <div className="fl-draw-run">
          {model.randomTags > 0 || model.points ? (
            <button type="button" className="fl-btn" onClick={run}>
              Run the draw
            </button>
          ) : null}
          <p className="fl-result" aria-live="polite">
            {result}
          </p>
        </div>
      </div>
      <div className="fl-ladder" ref={box}>
        {model.rows.map((r, ri) => (
          <Rows key={ri} cut={ri === model.cutAt ? model : null}>
            <div className={"lv" + (ri === meRow ? " you" : "")}>
              {ri === meRow ? "you ▸ " : ""}
              {r.label}
            </div>
            <div className="dots">
              {Array.from({ length: layout[ri].n }, (_, j) => {
                const me = ri === meRow && j === meAt;
                return <i key={j} className={"d" + (me ? " me" : "")} data-row={ri} data-me={me ? "1" : undefined} />;
              })}
            </div>
            <div className="lr">
              {model.points
                ? `${num.format(r.drew)} of ${num.format(r.applicants)} drew`
                : `${num.format(model.randomTags)} of ${num.format(r.applicants)} drew`}
            </div>
          </Rows>
        ))}
      </div>
      <div className="fl-key">
        {model.points && (
          <span>
            <i className="d pt" />
            Drew on points
          </span>
        )}
        <span>
          <i className="d rd" />
          Won the random draw
        </span>
        <span>
          <i className="d" />
          Went home empty
        </span>
        <span>
          <i className="d me" />
          You
        </span>
      </div>
    </section>
  );
}

function Rows({ cut, children }: { cut: { losers: number; randomTags: number } | null; children: React.ReactNode }) {
  return (
    <>
      {cut && (
        <div className="fl-cut">
          Points ran out · {num.format(cut.losers)} go to the random draw for {plural(cut.randomTags, "tag")}
        </div>
      )}
      {children}
    </>
  );
}
