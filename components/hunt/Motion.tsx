"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

// Page-wide motion: smooth scrolling that keeps every scroll-driven scene in
// step, and headings that rise into place line by line. Nothing runs for
// readers who ask their system for less motion.
export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger, SplitText);

    const lenis = new Lenis({
      lerp: 0.1,
      // Land a jumped-to section below the fixed header.
      anchors: { offset: -88 },
      // Maps and wide tables scroll themselves.
      prevent: (node) => !!node.closest?.(".maplibregl-map, .table-scroll, .fl-track"),
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const splits: SplitText[] = [];
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      document.querySelectorAll<HTMLElement>(".fl-rise").forEach((el) =>
        splits.push(
          SplitText.create(el, {
            type: "lines, words",
            mask: "lines",
            autoSplit: true,
            onSplit: (s) => gsap.from(s.words, { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.06, delay: 0.15 }),
          })
        )
      );
      document.querySelectorAll<HTMLElement>(".fl-reveal").forEach((el) =>
        splits.push(
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (s) =>
              gsap.from(s.lines, {
                yPercent: 105,
                duration: 1.1,
                ease: "expo.out",
                stagger: 0.1,
                scrollTrigger: { trigger: el, start: "top 85%" },
              }),
          })
        )
      );
      ScrollTrigger.refresh();
    });

    return () => {
      live = false;
      splits.forEach((s) => s.revert());
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}
