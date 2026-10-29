"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MAX_POINTS, savedPoints, setPoints, speciesOf, usePoints } from "@/lib/points";
import { track } from "@/lib/track";

// The masthead on every hunting page: the site, the species, and the one
// input the whole page answers to, the hunter's own preference points.
export default function HuntHeader({ siteName }: { siteName: string }) {
  const path = usePathname();
  const species = speciesOf(path);
  const pts = usePoints(species);
  // Over the hero the bar is clear; once the page scrolls under it, it frosts.
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // A browser that already holds points has been here before. Sent on the
  // next tick, once the analytics script further down the page is set up.
  useEffect(() => {
    const saved = savedPoints();
    if (!saved) return;
    const t = setTimeout(() => track("returning", saved));
    return () => clearTimeout(t);
  }, []);
  const nav = [
    { href: "/hunting/elk", label: "Elk" },
    { href: "/hunting/deer", label: "Deer" },
  ];

  return (
    <header className={"hs-top" + (solid ? " solid" : "")}>
      <a className="hs-brand" href="/">
        <svg viewBox="0 0 26 26" aria-hidden="true">
          <circle cx="13" cy="15" r="5.5" fill="#ffd27a" />
          <path d="M1 19.5h24" stroke="#f4efe6" strokeWidth="1.2" />
          <path d="M3 19.5l5-6 3 3.5 4-6.5 8 9" fill="none" stroke="#f4efe6" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span>{siteName}</span>
      </a>
      <nav className="hs-nav" aria-label="Hunting">
        {nav.map((n) => (
          <a key={n.href} href={n.href} className={path?.startsWith(n.href) ? "on" : ""}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="hs-pts">
        <label htmlFor="hs-points" className="hs-pts-label">
          <span className="long">{species === "elk" ? "Elk" : "Deer"} </span>points
        </label>
        <button type="button" aria-label="One fewer point" onClick={() => setPoints(species, pts - 1)} disabled={pts <= 0}>
          −
        </button>
        <input
          id="hs-points"
          aria-label={`Your ${species} preference points`}
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_POINTS}
          value={pts}
          onChange={(e) => setPoints(species, Number(e.target.value) || 0)}
        />
        <button type="button" aria-label="One more point" onClick={() => setPoints(species, pts + 1)} disabled={pts >= MAX_POINTS}>
          +
        </button>
      </div>
    </header>
  );
}
