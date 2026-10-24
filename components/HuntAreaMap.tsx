"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import type { Bounds } from "@/lib/site";
import type { MapOverlay, MapPoint } from "./WyomingMap";

// MapLibre touches `window` at import time, so keep it out of the server bundle.
const WyomingMap = dynamic(() => import("./WyomingMap"), { ssr: false });

const HIGHLIGHT = "#2f5d8a";
const OTHER = "#7c878c";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

// Hunt-area boundaries with one clickable marker per area. `highlight` is the
// area the page is about (or the areas of a region page); every other area is
// drawn faintly for context.
export default function HuntAreaMap({
  areas: initialAreas,
  areasUrl,
  markers,
  bounds,
  highlight,
  hrefFor,
}: {
  // Pass the boundaries inline for a few areas, or a URL for the whole state so
  // they are not serialized into the page's HTML.
  areas?: FeatureCollection;
  areasUrl?: string;
  markers: { area: number; name: string; lat: number; lng: number }[];
  bounds: Bounds;
  highlight?: number | number[];
  hrefFor: string; // path with {area} placeholder, e.g. "/hunting/elk/area-{area}"
}) {
  const [satellite, setSatellite] = useState(false);
  const [fetched, setFetched] = useState<FeatureCollection | null>(null);
  const areas = initialAreas ?? fetched ?? EMPTY;

  useEffect(() => {
    if (!areasUrl) return;
    let cancelled = false;
    fetch(areasUrl)
      .then((r) => r.json())
      .then((fc: FeatureCollection) => !cancelled && setFetched(fc))
      .catch((err) => console.error("Hunt area boundaries did not load:", err));
    return () => {
      cancelled = true;
    };
  }, [areasUrl]);
  const lit = highlight === undefined ? [] : ([] as number[]).concat(highlight);
  const isHighlight = ["in", ["get", "area"], ["literal", lit]];

  const overlays = useMemo<MapOverlay[]>(
    () => [
      {
        id: "hunt-areas",
        data: areas,
        fill: {
          "fill-color": ["case", isHighlight, HIGHLIGHT, OTHER],
          "fill-opacity": ["case", isHighlight, 0.22, 0.06],
        },
        line: {
          "line-color": ["case", isHighlight, HIGHLIGHT, OTHER],
          "line-width": ["case", isHighlight, 2.5, 1],
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [areas, highlight]
  );

  const points = useMemo<MapPoint[]>(
    () =>
      markers.map((m) => ({
        id: String(m.area),
        name: `Area ${m.area}: ${m.name}`,
        lat: m.lat,
        lng: m.lng,
        color: lit.includes(m.area) ? HIGHLIGHT : OTHER,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markers, highlight]
  );

  return (
    <div className="mapwrap hunt-map">
      <WyomingMap
        points={points}
        overlays={overlays}
        activeId={null}
        onSelect={(id) => {
          // Clicking the page's own area goes nowhere; on a region page every area links.
          if (Number(id) !== highlight) window.location.href = hrefFor.replace("{area}", id);
        }}
        initialBounds={bounds}
        satellite={satellite}
      />
      <button
        className={"map-toggle" + (satellite ? " on" : "")}
        onClick={() => setSatellite((v) => !v)}
        aria-pressed={satellite}
      >
        Satellite
      </button>
    </div>
  );
}
