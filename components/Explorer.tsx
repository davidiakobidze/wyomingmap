"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  Place,
  PlaceCategory,
} from "@/lib/places";
import type { MapPoint } from "./WyomingMap";

// MapLibre touches `window` at import time, so keep it out of the server bundle.
const WyomingMap = dynamic(() => import("./WyomingMap"), { ssr: false });

export default function Explorer({ places }: { places: Place[] }) {
  const [categories, setCategories] = useState<Set<PlaceCategory>>(new Set(CATEGORY_ORDER));
  const [active, setActive] = useState<string | null>(null);

  const visible = useMemo(
    () => places.filter((p) => categories.has(p.category)),
    [places, categories]
  );
  const current = visible.find((p) => p.slug === active) ?? null;

  const points = useMemo<MapPoint[]>(
    () =>
      visible.map((p) => ({
        id: p.slug,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        color: CATEGORY_COLORS[p.category],
      })),
    [visible]
  );

  const toggleCategory = (c: PlaceCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  const onSelect = useCallback((slug: string) => setActive(slug), []);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">Wyoming Map</a>
        <span className="tagline">One view to understand Wyoming.</span>
        <span className="count">{visible.length} of {places.length} places</span>
      </header>

      <aside className="sidebar">
        <div className="filters">
          <div className="chips">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                className={"chip" + (categories.has(c) ? " on" : "")}
                onClick={() => toggleCategory(c)}
                aria-pressed={categories.has(c)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <ul className="list">
          {visible.map((p) => (
            <li key={p.slug}>
              <button
                className={"row" + (p.slug === active ? " active" : "")}
                onClick={() => setActive(p.slug)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                <span>
                  <div className="name">{p.name}</div>
                  <div className="sub">{p.region}</div>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {current && (
          <div className="detail">
            <button className="close" onClick={() => setActive(null)} aria-label="Close">
              ×
            </button>
            <div className="kicker">
              <span className="dot" style={{ background: CATEGORY_COLORS[current.category] }} />
              {CATEGORY_LABELS[current.category]} · {current.region}
            </div>
            <h2>{current.name}</h2>
            <p>{current.summary}</p>
            {current.season && <p className="season">{current.season}</p>}
            {current.link && (
              <p className="src">
                <a href={current.link} target="_blank" rel="noopener noreferrer">
                  More about this place ↗
                </a>
              </p>
            )}
            <p className="approx">Marker shows the approximate location.</p>
          </div>
        )}
      </aside>

      <div className="mapwrap">
        <WyomingMap points={points} activeId={active} onSelect={onSelect} />
      </div>
    </div>
  );
}
