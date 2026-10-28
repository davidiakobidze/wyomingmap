"use client";

import { usePathname } from "next/navigation";
import { MAX_POINTS, setPoints, speciesOf, usePoints } from "@/lib/points";

// The masthead on every hunting page: the site, the species, and the one
// input the whole page answers to, the hunter's own preference points.
export default function HuntHeader({ siteName, year }: { siteName: string; year: number }) {
  const path = usePathname();
  const species = speciesOf(path);
  const pts = usePoints(species);
  const nav = [
    { href: "/hunting/elk", label: "Elk" },
    { href: "/hunting/deer", label: "Deer" },
    { href: "/", label: "Visitor map" },
  ];

  return (
    <header className="hs-top">
      <a className="hs-brand" href="/hunting/elk">
        {siteName}
        <small>Hunt sheets · {year}</small>
      </a>
      <nav className="hs-nav" aria-label="Hunting">
        {nav.map((n) => (
          <a key={n.href} href={n.href} className={n.href !== "/" && path?.startsWith(n.href) ? "on" : ""}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="hs-pts">
        <label htmlFor="hs-points" className="hs-pts-label">
          <span className="long">Your {species} </span>points
        </label>
        <div className="hs-step">
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
          <button
            type="button"
            aria-label="One more point"
            onClick={() => setPoints(species, pts + 1)}
            disabled={pts >= MAX_POINTS}
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
}
