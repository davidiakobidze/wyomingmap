"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type CameraOptions, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Position } from "geojson";
import { WYOMING_BOUNDS, type Bounds } from "@/lib/site";
import { demSource } from "./dem";
import { at, contourOpacity, dawnStyle, drawn, relief, sky } from "./dawnStyle";

export interface DawnMapProps {
  focus: FeatureCollection; // the area (or a region's areas) the camera flies to
  bbox: Bounds;
  start: "state" | "near"; // open on the whole state, or just above the area
  contextUrl?: string; // every area in the state, as faint lines
  onReady: (render: (p: number) => void) => void;
  onFail: () => void;
}

// The thresholds the hero shows; finer contours would only be noise at this scale.
const CONTOURS = {
  multiplier: 3.28084,
  thresholds: { 7: [1000, 5000], 8: [500, 2500], 9: [200, 1000], 11: [100, 500] },
  elevationKey: "ele",
  levelKey: "level",
  contourLayer: "contours",
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
type Cam = Required<Pick<CameraOptions, "zoom" | "pitch" | "bearing">> & { center: [number, number] };
const between = (a: Cam, b: Cam, t: number): Cam => ({
  center: [lerp(a.center[0], b.center[0], t), lerp(a.center[1], b.center[1], t)],
  zoom: lerp(a.zoom, b.zoom, t),
  pitch: lerp(a.pitch, b.pitch, t),
  bearing: lerp(a.bearing, b.bearing, t),
});

// Each polygon's outer ring as a line, so its outline can be drawn on.
function outlines(fc: FeatureCollection): FeatureCollection {
  const rings: Position[][] = [];
  fc.features.forEach((f) => {
    const g = f.geometry;
    if (g.type === "Polygon") rings.push(g.coordinates[0]);
    if (g.type === "MultiPolygon") g.coordinates.forEach((p) => rings.push(p[0]));
  });
  return {
    type: "FeatureCollection",
    features: rings.map((r) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: r } })),
  };
}

// The 3D terrain behind a hero. It never takes input; the scroll drives it
// through the render function it hands back.
export default function DawnMap({ focus, bbox, start, contextUrl, onReady, onFail }: DawnMapProps) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const src = demSource();
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: node,
        style: dawnStyle(src.sharedDemProtocolUrl, src.contourProtocolUrl(CONTOURS)),
        bounds: (start === "state" ? WYOMING_BOUNDS : bbox) as LngLatBoundsLike,
        interactive: false,
        attributionControl: { compact: true },
        maxPitch: 75,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      });
    } catch (err) {
      console.error("Hero map could not start:", err);
      node.replaceChildren();
      onFail();
      return;
    }

    const phone = window.innerWidth < 760;
    const W = node.clientWidth;
    const H = node.clientHeight;
    // Leave room for the words: the headline and odds card on a desktop's left
    // and right, the card along the bottom of a phone.
    const pad = phone
      ? { top: 170, bottom: Math.round(H * 0.42), left: 24, right: 24 }
      : { top: 140, bottom: Math.round(H * 0.22), left: Math.round(W * 0.3), right: Math.round(W * 0.34) };
    const fit = (b: Bounds, padding: typeof pad | number): Cam => {
      const c = map.cameraForBounds(b as LngLatBoundsLike, { padding }) ?? {};
      const ll = maplibregl.LngLat.convert(c.center ?? [-107.5, 43]);
      return { center: [ll.lng, ll.lat], zoom: c.zoom ?? 6, pitch: 0, bearing: 0 };
    };
    const target = fit(bbox, pad);
    const START: Cam =
      start === "state"
        ? fit(WYOMING_BOUNDS, phone ? { top: 120, bottom: 120, left: 12, right: 12 } : { top: 80, bottom: 80, left: Math.round(W * 0.3), right: 40 })
        : { ...target, zoom: target.zoom - 1.6 };
    const MID: Cam = { ...target, zoom: target.zoom + 0.25, pitch: phone ? 55 : 60, bearing: -24 };
    const END: Cam = { ...target, zoom: target.zoom + 0.5, pitch: phone ? 60 : 66, bearing: -50 };

    // isStyleLoaded() also waits on every source's tiles, which would drop the
    // first frame; the paint properties only need the style itself.
    let ready = false;
    let lines = false;
    let last = 0;
    const render = (p: number) => {
      last = p;
      if (!ready) return;
      map.jumpTo(p < 0.45 ? between(START, MID, smooth(0.04, 0.45, p)) : between(MID, END, smooth(0.45, 1, p)));
      // The sun comes up in the east and climbs from grazing light to morning.
      const s = smooth(0.06, 0.72, p);
      map.setPaintProperty("shade", "hillshade-illumination-altitude", lerp(4, 38, s));
      map.setPaintProperty("shade", "hillshade-illumination-direction", lerp(80, 118, s));
      map.setPaintProperty("shade", "hillshade-highlight-color", at("hi", s));
      map.setPaintProperty("shade", "hillshade-shadow-color", at("sh", s));
      map.setPaintProperty("shade", "hillshade-accent-color", at("ac", s));
      map.setPaintProperty("relief", "color-relief-color", relief(s));
      map.setPaintProperty("bg", "background-color", at("lo", s));
      map.setPaintProperty("water", "fill-color", at("water", s));
      map.setPaintProperty("river", "line-color", at("water", s));
      map.setPaintProperty("contour", "line-opacity", contourOpacity(s));
      map.setSky(sky(s));
      map.setPaintProperty("towns", "text-halo-color", s < 0.5 ? "rgba(10,15,28,0.85)" : "rgba(36,24,34,0.92)");
      if (lines) {
        const d = smooth(0.38, 0.62, p);
        map.setPaintProperty("focus-line", "line-gradient", drawn(d, 1));
        map.setPaintProperty("focus-glow", "line-gradient", drawn(d, 0.55));
        // Against bright morning ground the gold needs a dark edge to read.
        map.setPaintProperty("focus-case", "line-gradient", drawn(d, 0.55 * smooth(0.45, 0.75, p), "36,20,30"));
        map.setPaintProperty("focus-fill", "fill-opacity", 0.1 * smooth(0.6, 0.72, p));
        if (map.getLayer("context")) map.setPaintProperty("context", "line-opacity", 0.06 + 0.12 * (1 - smooth(0.3, 0.5, p)));
      }
    };

    map.on("load", () => {
      ready = true;
      node.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      map.addSource("focus", { type: "geojson", data: focus });
      map.addSource("focus-line", { type: "geojson", lineMetrics: true, data: outlines(focus) });
      map.addLayer({ id: "focus-fill", type: "fill", source: "focus", paint: { "fill-color": "#ffd27a", "fill-opacity": 0 } }, "towns");
      const round = { "line-cap": "round", "line-join": "round" } as const;
      map.addLayer({ id: "focus-glow", type: "line", source: "focus-line", layout: round, paint: { "line-width": 12, "line-blur": 8, "line-gradient": drawn(0, 0.55) } }, "towns");
      map.addLayer({ id: "focus-case", type: "line", source: "focus-line", layout: round, paint: { "line-width": 5.5, "line-blur": 1, "line-gradient": drawn(0, 0, "36,20,30") } }, "towns");
      map.addLayer({ id: "focus-line", type: "line", source: "focus-line", layout: round, paint: { "line-width": 2.5, "line-gradient": drawn(0, 1) } }, "towns");
      lines = true;
      if (contextUrl) {
        fetch(contextUrl)
          .then((r) => r.json())
          .then((fc: FeatureCollection) => {
            map.addSource("context", { type: "geojson", data: fc });
            map.addLayer({ id: "context", type: "line", source: "context", paint: { "line-color": "#f4efe6", "line-opacity": 0.18, "line-width": 0.8 } }, "focus-fill");
            render(last);
          })
          .catch((err) => console.error("Hunt area boundaries did not load:", err));
      }
      render(last);
      onReady(render);
    });

    return () => map.remove();
    // The hero mounts once per page; its props never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={el} className="fl-mapcanvas" />;
}
