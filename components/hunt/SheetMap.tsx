"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import mlcontour from "maplibre-contour";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Position } from "geojson";
import type { Bounds } from "@/lib/site";
import { C, DEM_MAXZOOM, DEM_TILES, sheetStyle } from "./sheetStyle";

export interface AreaLabel {
  area: number;
  name: string;
  lat: number;
  lng: number;
}

export interface SheetMapProps {
  areas: FeatureCollection; // hunt-area boundaries, each with an `area` number
  labels: AreaLabel[];
  bounds: Bounds;
  highlight: number[]; // the page's own area, or a region's areas
  hrefFor: string; // "/hunting/elk/area-{area}"
  fills?: Record<number, string> | null; // statewide maps: a color per area
  tips?: Record<number, string>; // a second line for the hover label
  satellite: boolean;
}

// One DEM source for the whole page: the hillshade and the contour lines read
// the same cached tiles, and contours are traced in a web worker.
let dem: InstanceType<typeof mlcontour.DemSource> | null = null;
function demSource() {
  if (!dem) {
    dem = new mlcontour.DemSource({ url: DEM_TILES, encoding: "terrarium", maxzoom: DEM_MAXZOOM, worker: true });
    dem.setupMaplibre(maplibregl);
  }
  return dem;
}

// Feet, with an index line every fifth contour, as on a USGS quad.
const CONTOURS = {
  multiplier: 3.28084,
  thresholds: { 7: [1000, 5000], 8: [500, 2500], 9: [200, 1000], 11: [100, 500], 12: [40, 200] },
  elevationKey: "ele",
  levelKey: "level",
  contourLayer: "contours",
};

const USGS_IMAGERY =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";

const ringArea = (r: Position[]) =>
  r.reduce((s, [x, y], i) => {
    const [x2, y2] = r[(i + 1) % r.length];
    return s + (x * y2 - x2 * y);
  }, 0);

// Everything outside the highlighted areas, to lay a sheet of paper over: a
// box around the state with each area's outer ring cut out of it.
function veil(areas: FeatureCollection, lit: number[]): Feature {
  const outer: Position[] = [
    [-125, 35],
    [-95, 35],
    [-95, 50],
    [-125, 50],
    [-125, 35],
  ];
  const holes: Position[][] = [];
  areas.features.forEach((f) => {
    if (!lit.includes(Number(f.properties?.area))) return;
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    polys.forEach((p) => {
      const ring = p[0];
      // Holes wind the other way from the outer ring, or MapLibre reads them as more fill.
      holes.push(Math.sign(ringArea(ring)) === Math.sign(ringArea(outer)) ? [...ring].reverse() : ring);
    });
  });
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [outer, ...holes] } };
}

function peakIcon(): ImageData {
  const n = 14;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  g.fillStyle = C.ink;
  g.strokeStyle = C.paper;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(n / 2, 2);
  g.lineTo(n - 2, n - 3);
  g.lineTo(2, n - 3);
  g.closePath();
  g.stroke();
  g.fill();
  return g.getImageData(0, 0, n, n);
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function SheetMap({ areas, labels, bounds, highlight, hrefFor, fills, tips, satellite }: SheetMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const props = useRef({ areas, labels, highlight, fills, tips, satellite });
  props.current = { areas, labels, highlight, fills, tips, satellite };
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!el || map.current) return;
    const src = demSource();
    const statewide = props.current.highlight.length === 0;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: el,
        style: sheetStyle(src.sharedDemProtocolUrl, src.contourProtocolUrl(CONTOURS)),
        bounds,
        fitBoundsOptions: { padding: statewide ? 16 : 36 },
        attributionControl: { compact: true },
        cooperativeGestures: true,
        maxZoom: 15,
      });
    } catch (err) {
      // No WebGL. MapLibre leaves its own DOM behind before throwing.
      console.error("Hunt map could not start:", err);
      el.replaceChildren();
      setUnsupported(true);
      return;
    }
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.FullscreenControl(), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "imperial", maxWidth: 120 }), "bottom-left");
    m.on("styleimagemissing", (e) => {
      if (e.id === "peak" && !m.hasImage("peak")) m.addImage("peak", peakIcon(), { pixelRatio: 2 });
    });

    let antsTimer: number | undefined;
    m.on("load", () => {
      const { areas, labels, highlight } = props.current;
      const lit: ExpressionSpecification = ["in", ["get", "area"], ["literal", highlight]];
      const before = "contour-label";
      m.addSource("imagery", {
        type: "raster",
        tiles: [USGS_IMAGERY],
        tileSize: 256,
        maxzoom: 16,
        attribution: "USDA, USGS The National Map",
      });
      m.addLayer({ id: "imagery", type: "raster", source: "imagery", layout: { visibility: "none" } }, "park");
      m.addSource("areas", { type: "geojson", data: areas, promoteId: "area" });
      m.addSource("area-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: labels.map((l) => ({
            type: "Feature",
            properties: { area: l.area, name: l.name },
            geometry: { type: "Point", coordinates: [l.lng, l.lat] },
          })),
        },
      });
      m.addLayer(
        {
          id: "areas-fill",
          type: "fill",
          source: "areas",
          paint: {
            "fill-color": ["case", lit, C.rev, C.ink],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.14,
              lit,
              0.05,
              0,
            ],
          },
        },
        before
      );
      if (!statewide) {
        m.addSource("veil", { type: "geojson", data: veil(areas, highlight) });
        m.addLayer({ id: "veil", type: "fill", source: "veil", paint: { "fill-color": C.paper, "fill-opacity": 0.3 } }, before);
      }
      m.addLayer(
        {
          id: "areas-line",
          type: "line",
          source: "areas",
          filter: ["!", lit],
          paint: statewide
            ? { "line-color": C.ink, "line-width": 0.6, "line-opacity": 0.55 }
            : { "line-color": C.field, "line-width": 1.1, "line-dasharray": [4, 2.5], "line-opacity": 0.85 },
        },
        before
      );
      m.addLayer(
        {
          id: "areas-hover",
          type: "line",
          source: "areas",
          paint: {
            "line-color": C.ink,
            "line-width": 2,
            "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
          },
        },
        before
      );
      m.addLayer(
        { id: "areas-lit", type: "line", source: "areas", filter: lit, paint: { "line-color": C.rev, "line-width": 2.8 } },
        before
      );
      m.addLayer(
        {
          id: "areas-ants",
          type: "line",
          source: "areas",
          filter: lit,
          paint: { "line-color": "#fff", "line-width": 1.6, "line-dasharray": [0, 0, 2, 3] },
        },
        before
      );
      m.addLayer({
        id: "area-num",
        type: "symbol",
        source: "area-labels",
        minzoom: statewide ? 5.6 : 0,
        layout: {
          "text-field": ["case", ["in", ["get", "area"], ["literal", highlight]], ["concat", "AREA ", ["get", "area"]], ["to-string", ["get", "area"]]],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["case", ["in", ["get", "area"], ["literal", highlight]], highlight.length > 1 ? 12 : 15, statewide ? 10.5 : 12],
          "text-letter-spacing": ["case", ["in", ["get", "area"], ["literal", highlight]], 0.35, 0],
          "symbol-sort-key": ["case", ["in", ["get", "area"], ["literal", highlight]], 0, 1],
        },
        paint: {
          "text-color": ["case", ["in", ["get", "area"], ["literal", highlight]], C.rev, statewide ? C.ink : C.field],
          "text-halo-color": C.paper,
          "text-halo-width": 2,
        },
      });
      ready.current = true;
      applyFills(m, props.current.fills);
      applySatellite(m, props.current.satellite);

      // Marching ants around the page's own area: step through dash offsets.
      if (!statewide && !reducedMotion()) {
        // A 2-on, 3-off dash shifted half a unit per step; dash arrays must start with a dash.
        const seq = Array.from({ length: 10 }, (_, k) => {
          const at = k / 2;
          return at <= 3 ? [0, at, 2, 3 - at] : [at - 3, 3, 5 - at];
        });
        let i = 0;
        antsTimer = window.setInterval(() => {
          if (document.hidden) return;
          i = (i + 1) % seq.length;
          m.setPaintProperty("areas-ants", "line-dasharray", seq[i]);
        }, 90);
      }
    });

    // Hover: outline the area under the pointer and say what it is.
    const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "hs-pop", offset: 12 });
    let hovered: number | null = null;
    const clear = () => {
      if (hovered !== null) m.setFeatureState({ source: "areas", id: hovered }, { hover: false });
      hovered = null;
      pop.remove();
      m.getCanvas().style.cursor = "";
    };
    m.on("mousemove", "areas-fill", (e) => {
      const f = e.features?.[0];
      const area = Number(f?.properties?.area);
      if (!f || !area) return;
      if (hovered !== area) {
        clear();
        hovered = area;
        m.setFeatureState({ source: "areas", id: area }, { hover: true });
      }
      const { highlight, tips, labels } = props.current;
      const own = highlight.length === 1 && highlight[0] === area;
      m.getCanvas().style.cursor = own ? "" : "pointer";
      const name = labels.find((l) => l.area === area)?.name ?? f.properties?.name ?? "";
      const node = document.createElement("div");
      const b = document.createElement("b");
      b.textContent = `Area ${area}`;
      const s = document.createElement("span");
      s.textContent = name;
      node.append(b, s);
      const tip = tips?.[area];
      if (tip) {
        const t = document.createElement("em");
        t.textContent = tip;
        node.append(t);
      }
      pop.setLngLat(e.lngLat).setDOMContent(node).addTo(m);
    });
    m.on("mouseleave", "areas-fill", clear);
    m.on("click", "areas-fill", (e) => {
      const area = Number(e.features?.[0]?.properties?.area);
      const { highlight } = props.current;
      if (!area || (highlight.length === 1 && highlight[0] === area)) return;
      window.location.href = hrefFor.replace("{area}", String(area));
    });

    map.current = m;
    return () => {
      window.clearInterval(antsTimer);
      ready.current = false;
      m.remove();
      map.current = null;
    };
    // Bounds and areas are the starting state; the page does not swap them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (map.current && ready.current) applyFills(map.current, fills);
  }, [fills]);

  useEffect(() => {
    if (map.current && ready.current) applySatellite(map.current, satellite);
  }, [satellite]);

  if (unsupported) {
    return (
      <div className="map map-fallback" role="alert">
        <p>This map needs WebGL, which your browser has turned off or cannot run.</p>
      </div>
    );
  }
  return <div ref={container} className="map" />;
}

// Statewide maps color every area by the hunter's chance; the area pages leave this null.
function applyFills(m: maplibregl.Map, fills?: Record<number, string> | null) {
  if (!fills) return;
  const entries = Object.entries(fills).flatMap(([a, c]) => [Number(a), c]);
  m.setPaintProperty(
    "areas-fill",
    "fill-color",
    entries.length ? ["match", ["get", "area"], ...entries, "rgba(0,0,0,0)"] : "rgba(0,0,0,0)"
  );
  m.setPaintProperty("areas-fill", "fill-opacity", [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.8,
    0.5,
  ]);
}

function applySatellite(m: maplibregl.Map, on: boolean) {
  m.setLayoutProperty("imagery", "visibility", on ? "visible" : "none");
  ["contour-minor", "contour-index", "contour-label"].forEach((id) =>
    m.setLayoutProperty(id, "visibility", on ? "none" : "visible")
  );
}
