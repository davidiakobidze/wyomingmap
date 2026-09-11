"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { Bounds, WYOMING_BOUNDS } from "@/lib/site";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color?: string;
  className?: string;
}

// A GeoJSON collection drawn under the markers. Each defined paint block
// becomes one MapLibre layer, so a polygon overlay can have a fill and an
// outline by setting both `fill` and `line`.
export interface MapOverlay {
  id: string;
  data: FeatureCollection;
  fill?: Record<string, unknown>;
  line?: Record<string, unknown>;
}

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const DEFAULT_COLOR = "#2f5d8a";

// Free USGS orthoimagery (NAIP-derived), web mercator, no key.
const IMAGERY_ID = "usgs-imagery";
const IMAGERY_TILES =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_ATTRIBUTION = "USDA, USGS The National Map";

const sourceId = (o: MapOverlay) => `overlay-${o.id}`;
const layerIds = (o: MapOverlay) => ({ fill: `${sourceId(o)}-fill`, line: `${sourceId(o)}-line` });

// Labels (symbol layers) stay on top of everything we add. Overlays go just
// under the labels; imagery goes under the overlays too, so a satellite view
// never hides a fire perimeter.
const firstSymbolLayer = (m: maplibregl.Map) =>
  m.getStyle().layers.find((l) => l.type === "symbol")?.id;
const firstOverlayOrSymbolLayer = (m: maplibregl.Map) =>
  m.getStyle().layers.find((l) => l.id.startsWith("overlay-") || l.type === "symbol")?.id;

function applyImagery(m: maplibregl.Map, visible: boolean) {
  if (!m.getSource(IMAGERY_ID)) {
    m.addSource(IMAGERY_ID, {
      type: "raster",
      tiles: [IMAGERY_TILES],
      tileSize: 256,
      maxzoom: 16,
      attribution: IMAGERY_ATTRIBUTION,
    });
    m.addLayer(
      {
        id: IMAGERY_ID,
        type: "raster",
        source: IMAGERY_ID,
        layout: { visibility: visible ? "visible" : "none" },
      },
      firstOverlayOrSymbolLayer(m)
    );
  } else {
    m.setLayoutProperty(IMAGERY_ID, "visibility", visible ? "visible" : "none");
  }
}

function applyOverlays(m: maplibregl.Map, overlays: MapOverlay[], previous: Set<string>) {
  const beforeId = firstSymbolLayer(m);
  const wanted = new Set(overlays.map(sourceId));
  previous.forEach((src) => {
    if (wanted.has(src)) return;
    [`${src}-fill`, `${src}-line`].forEach((l) => m.getLayer(l) && m.removeLayer(l));
    if (m.getSource(src)) m.removeSource(src);
    previous.delete(src);
  });
  overlays.forEach((o) => {
    const src = sourceId(o);
    const ids = layerIds(o);
    const existing = m.getSource(src) as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(o.data);
    } else {
      m.addSource(src, { type: "geojson", data: o.data });
      previous.add(src);
    }
    if (o.fill && !m.getLayer(ids.fill)) {
      m.addLayer({ id: ids.fill, type: "fill", source: src, paint: o.fill as never }, beforeId);
    }
    if (o.line && !m.getLayer(ids.line)) {
      m.addLayer({ id: ids.line, type: "line", source: src, paint: o.line as never }, beforeId);
    }
  });
}

export default function WyomingMap({
  points = [],
  overlays = [],
  activeId = null,
  onSelect,
  initialBounds = WYOMING_BOUNDS,
  satellite = false,
}: {
  points?: MapPoint[];
  overlays?: MapOverlay[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  initialBounds?: Bounds;
  satellite?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const overlaySources = useRef<Set<string>>(new Set());
  const overlaysRef = useRef<MapOverlay[]>(overlays);
  const satelliteRef = useRef(satellite);
  const styleLoaded = useRef(false);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!el || map.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: el,
        style: STYLE,
        bounds: initialBounds,
        fitBoundsOptions: { padding: 30 },
        attributionControl: { compact: true },
      });
    } catch (err) {
      // MapLibre throws synchronously when WebGL is unavailable. Without this the
      // whole React tree unmounts and the visitor gets a blank page. It also injects
      // its own DOM before throwing, and React won't clean up nodes it didn't create,
      // so drop the debris or it shows through behind the fallback.
      console.error("Wyoming map could not start:", err);
      el.replaceChildren();
      setUnsupported(true);
      return;
    }
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Sources and layers can only be added once the style has loaded. Anything
    // that arrived before then is applied here.
    m.on("load", () => {
      styleLoaded.current = true;
      applyImagery(m, satelliteRef.current);
      applyOverlays(m, overlaysRef.current, overlaySources.current);
    });
    map.current = m;
    return () => {
      markers.current.forEach((mk) => mk.remove());
      markers.current.clear();
      overlaySources.current.clear();
      styleLoaded.current = false;
      m.remove();
      map.current = null;
    };
    // initialBounds is only the starting view; changing it later should not re-create the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    overlaysRef.current = overlays;
    const m = map.current;
    if (!m || !styleLoaded.current) return;
    applyOverlays(m, overlays, overlaySources.current);
  }, [overlays]);

  useEffect(() => {
    satelliteRef.current = satellite;
    const m = map.current;
    if (!m || !styleLoaded.current) return;
    applyImagery(m, satellite);
  }, [satellite]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const wanted = new Set(points.map((p) => p.id));
    markers.current.forEach((mk, id) => {
      if (!wanted.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    });
    points.forEach((p) => {
      let mk = markers.current.get(p.id);
      if (!mk) {
        const el = document.createElement("button");
        el.className = "marker" + (p.className ? ` ${p.className}` : "");
        el.title = p.name;
        el.setAttribute("aria-label", p.name);
        el.style.background = p.color ?? DEFAULT_COLOR;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect?.(p.id);
        });
        mk = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
        markers.current.set(p.id, mk);
      }
      mk.getElement().classList.toggle("active", p.id === activeId);
    });
  }, [points, activeId, onSelect]);

  useEffect(() => {
    const m = map.current;
    if (!m || !activeId) return;
    const p = points.find((x) => x.id === activeId);
    // Photo spots inside Yellowstone sit a few km apart; 8.5 is close enough to tell them apart.
    if (p) m.easeTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), 8.5), duration: 600 });
  }, [activeId, points]);

  if (unsupported) {
    return (
      <div className="map map-fallback" role="alert">
        <p>
          This map needs WebGL, which your browser has turned off or cannot run.
          Enable hardware acceleration, or try a different browser.
        </p>
      </div>
    );
  }

  return <div ref={container} className="map" />;
}
