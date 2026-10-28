"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import type { Bounds } from "@/lib/site";
import { chanceShort } from "@/lib/hunts";
import { AreaOdds, chanceOf } from "@/lib/license";
import { Species, usePoints } from "@/lib/points";
import { CHANCE_LABELS, CHANCE_RAMP, C, chanceColor } from "./sheetStyle";
import type { AreaLabel } from "./SheetMap";

// MapLibre touches `window` at import time, so it stays out of the server bundle.
const SheetMap = dynamic(() => import("./SheetMap"), {
  ssr: false,
  loading: () => <div className="map map-loading" aria-hidden />,
});

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export default function HuntMap({
  areas: inline,
  areasUrl,
  labels,
  bounds,
  highlight = [],
  hrefFor,
  species,
  odds,
  choropleth = false,
  legend,
}: {
  areas?: FeatureCollection; // a few areas inline, or
  areasUrl?: string; // the whole state, fetched so it stays out of the HTML
  labels: AreaLabel[];
  bounds: Bounds;
  highlight?: number[];
  hrefFor: string;
  species: Species;
  odds?: Record<number, AreaOdds>;
  choropleth?: boolean; // color every area by the hunter's chance
  legend?: React.ReactNode;
}) {
  const pts = usePoints(species);
  const [satellite, setSatellite] = useState(false);
  const [fetched, setFetched] = useState<FeatureCollection | null>(null);

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
  const areas = inline ?? fetched;

  const chances = useMemo(() => {
    const out: Record<number, number> = {};
    Object.entries(odds ?? {}).forEach(([a, o]) => {
      out[Number(a)] = chanceOf(o, pts);
    });
    return out;
  }, [odds, pts]);

  const fills = useMemo(() => {
    if (!choropleth) return null;
    const out: Record<number, string> = {};
    Object.entries(chances).forEach(([a, c]) => (out[Number(a)] = chanceColor(c)));
    return out;
  }, [chances, choropleth]);

  const tips = useMemo(() => {
    const out: Record<number, string> = {};
    Object.entries(odds ?? {}).forEach(([a, o]) => {
      const c = chances[Number(a)];
      const at = "k" in o ? `with ${pts} point${pts === 1 ? "" : "s"}` : "random draw";
      out[Number(a)] = `${o.label}: ${chanceShort(c)} ${at}`;
    });
    return out;
  }, [odds, chances, pts]);

  return (
    <figure className="hs-mapfig">
      <div className="mapwrap hs-map">
        {areas ? (
          <SheetMap
            areas={areas ?? EMPTY}
            labels={labels}
            bounds={bounds}
            highlight={highlight}
            hrefFor={hrefFor}
            fills={fills}
            tips={tips}
            satellite={satellite}
          />
        ) : (
          <div className="map map-loading" aria-hidden />
        )}
        <div className="hs-layers" role="group" aria-label="Base map">
          <button type="button" aria-pressed={!satellite} onClick={() => setSatellite(false)}>
            Terrain
          </button>
          <button type="button" aria-pressed={satellite} onClick={() => setSatellite(true)}>
            Satellite
          </button>
        </div>
      </div>
      <figcaption className="hs-legend">
        {choropleth ? (
          <>
            <span className="hs-legend-title">
              Your chance with {pts} {species} point{pts === 1 ? "" : "s"}
            </span>
            <span className="hs-ramp">
              {CHANCE_RAMP.map((c, i) => (
                <span key={c}>
                  <i style={{ background: c }} />
                  {CHANCE_LABELS[i]}
                </span>
              ))}
              <span>
                <i className="none" />
                No draw
              </span>
            </span>
          </>
        ) : (
          <>
            <span>
              <i style={{ borderColor: C.rev }} />
              {legend ?? "This area"}
            </span>
            <span>
              <i style={{ borderColor: C.field, borderTopStyle: "dashed" }} />
              Adjoining areas
            </span>
            <span>
              <i style={{ borderColor: C.contour }} />
              Contours in feet
            </span>
            <span>
              <i style={{ borderColor: C.park, borderTopStyle: "dashed" }} />
              Forest, park or wilderness
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
