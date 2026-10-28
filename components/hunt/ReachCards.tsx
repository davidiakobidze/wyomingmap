"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { chanceBig } from "@/lib/hunts";
import { AreaOdds, chanceOf } from "@/lib/license";
import { usePoints } from "@/lib/points";

export interface ReachRow {
  num: string;
  name: string;
  sub: string;
  href: string;
  odds: AreaOdds;
  need: number; // whole points sure to draw
}

// The any-elk tags nearest the hunter's points: a sure tag a few years out,
// and the odds they hold until then. If they already hold enough for some,
// the best of those instead.
export default function ReachCards({ rows }: { rows: ReachRow[] }) {
  const pts = usePoints("elk");
  const { cards, ahead } = useMemo(() => {
    const near = rows
      .filter((r) => r.need > pts && r.need <= pts + 4)
      .map((r) => ({ r, c: chanceOf(r.odds, pts) }))
      .sort((a, b) => a.r.need - b.r.need || b.c - a.c)
      .slice(0, 8);
    if (near.length >= 3) return { cards: near, ahead: true };
    const sure = rows
      .filter((r) => r.need > 0 && r.need <= pts)
      .map((r) => ({ r, c: chanceOf(r.odds, pts) }))
      .sort((a, b) => b.r.need - a.r.need)
      .slice(0, 8);
    return { cards: [...near, ...sure].slice(0, 8), ahead: near.length > 0 };
  }, [rows, pts]);
  const top = Math.max(...cards.map((x) => x.r.need), pts) + 2;

  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    // On a wide screen the page pins and the row of cards slides past; a phone just swipes.
    mm.add("(min-width: 761px)", () => {
      gsap.to(el, {
        x: () => -Math.max(0, el.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: () => "+=" + Math.max(1, el.scrollWidth - window.innerWidth),
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
    });
    gsap.from(el.children, {
      y: 60,
      autoAlpha: 0,
      duration: 1,
      ease: "expo.out",
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
    return () => mm.revert();
  }, []);
  // A different set of cards changes the track's length.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [cards.length]);

  const tilt = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const a = e.currentTarget;
    const r = a.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    a.style.setProperty("--mx", `${x * 100}%`);
    a.style.setProperty("--my", `${y * 100}%`);
    gsap.to(a, { rotationY: (x - 0.5) * 10, rotationX: (0.5 - y) * 10, duration: 0.5, ease: "power3" });
  };
  const untilt = (e: React.PointerEvent<HTMLAnchorElement>) =>
    gsap.to(e.currentTarget, { rotationY: 0, rotationX: 0, duration: 0.6, ease: "power3" });

  return (
    <section className="fl-band fl-reach" ref={section}>
      <div className="fl-wrap">
        <div className="fl-eyebrow">Any-elk tags within reach</div>
        <h2 className="fl-display">
          At <em>{pts} point{pts === 1 ? "" : "s"}</em>, {ahead ? "these are closest." : "these are yours to draw."}
        </h2>
        <p className="fl-sub">
          {ahead
            ? `Elk areas where ${pts} point${pts === 1 ? " is" : "s are"} a few years from a sure tag, and the odds you hold in the meantime. Set your points at the top.`
            : `Areas where every nonresident with ${pts} points drew last year, toughest first. Set your points at the top.`}
        </p>
      </div>
      <div className="fl-track" ref={track}>
        {cards.map(({ r, c }) => (
          <a key={r.num} className="fl-rcard" href={r.href} onPointerMove={tilt} onPointerLeave={untilt}>
            <div className="n">{r.num}</div>
            <h3>{r.name}</h3>
            <div className="herd">{r.sub}</div>
            <div className="row">
              <b>{chanceBig(c)}</b>
              <span>
                your chance
                <br />
                at {pts} point{pts === 1 ? "" : "s"}
              </span>
            </div>
            <div className="runway" aria-hidden>
              <i className="base" />
              <i className="sure" style={{ left: `${(r.need / top) * 100}%` }} />
              <i className="you" style={{ left: `${(Math.min(pts, top) / top) * 100}%` }} />
            </div>
            <div className="runway-k">
              <span>0</span>
              <span>sure at {r.need}</span>
              <span>{top} pts</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
