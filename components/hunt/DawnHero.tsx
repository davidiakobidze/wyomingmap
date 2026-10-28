"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DawnMapProps } from "./DawnMap";

// MapLibre touches `window` at import time, so the terrain stays out of the server bundle.
const DawnMap = dynamic(() => import("./DawnMap"), { ssr: false });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// 5:40 to 7:02, sunrise.
function clock(p: number): string {
  const m = Math.round(lerp(340, 422, smooth(0, 0.8, p)));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} am${m >= 422 ? " · sunrise" : ""}`;
}

// A pinned stage the scroll plays like a film: night over the state, the
// camera dives to the area, the sun comes up, the area's outline draws itself
// and the odds card arrives. One number from 0 to 1 drives all of it.
export default function DawnHero({
  focus,
  bbox,
  start,
  contextUrl,
  length = 300,
  place,
  copy,
  tag,
  card,
}: Omit<DawnMapProps, "onReady" | "onFail"> & {
  length?: number; // scroll distance, in viewport heights
  place: string; // for the clock: "Laramie Peak"
  copy: React.ReactNode; // the headline block, server-rendered
  tag: React.ReactNode; // the area's name, shown once the camera arrives
  card: React.ReactNode; // the odds card
}) {
  const root = useRef<HTMLElement>(null);
  const render = useRef<((p: number) => void) | null>(null);
  const progress = useRef(0);
  const [mode, setMode] = useState<"idle" | "live" | "still">("idle");
  const [noMap, setNoMap] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      progress.current = 1;
      setMode("still");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    setMode("live");
    const q = gsap.utils.selector(root);
    const time = root.current?.querySelector(".fl-clock b");
    const apply = (p: number) => {
      progress.current = p;
      render.current?.(p);
      const out = smooth(0.08, 0.26, p);
      gsap.set(q(".fl-copy"), { autoAlpha: 1 - out, y: -60 * out });
      const tagIn = smooth(0.4, 0.55, p);
      gsap.set(q(".fl-tag"), { autoAlpha: tagIn, y: 30 * (1 - tagIn) });
      const cardIn = smooth(0.62, 0.76, p);
      gsap.set(q(".fl-card"), { autoAlpha: cardIn, y: 40 * (1 - cardIn) });
      const s = smooth(0.06, 0.72, p);
      gsap.set(q(".fl-sun"), { opacity: s * 0.9, yPercent: lerp(10, -45, s) });
      if (time) time.textContent = clock(p);
    };
    apply(0);
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      onUpdate: () => apply(proxy.p),
      scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section
      ref={root}
      className={`fl-hero ${mode}${noMap ? " nomap" : ""}`}
      style={{ "--len": `${length}vh` } as React.CSSProperties}
    >
      <div className="fl-stage">
        <div className="fl-map">
          {!noMap && (
            <DawnMap
              focus={focus}
              bbox={bbox}
              start={start}
              contextUrl={contextUrl}
              onFail={() => setNoMap(true)}
              onReady={(r) => {
                render.current = r;
                r(progress.current);
              }}
            />
          )}
        </div>
        <div className="fl-sun" aria-hidden />
        <div className="fl-veil" aria-hidden />
        <div className="fl-clock" aria-hidden>
          Opening morning · {place}
          <b>{clock(mode === "still" ? 1 : 0)}</b>
        </div>
        <div className="fl-copy">{copy}</div>
        <div className="fl-tag" aria-hidden={mode === "live" ? undefined : true}>
          {tag}
        </div>
        <div className="fl-card">{card}</div>
        {mode === "live" && (
          <div className="fl-cue" aria-hidden>
            <i />
          </div>
        )}
      </div>
    </section>
  );
}
