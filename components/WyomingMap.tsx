"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color?: string;
}

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const WYOMING_BOUNDS: [[number, number], [number, number]] = [
  [-111.2, 40.9],
  [-104.0, 45.1],
];
const DEFAULT_COLOR = "#2f5d8a";

export default function WyomingMap({
  points = [],
  activeId = null,
  onSelect,
}: {
  points?: MapPoint[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!el || map.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: el,
        style: STYLE,
        bounds: WYOMING_BOUNDS,
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
    map.current = m;
    return () => {
      markers.current.forEach((mk) => mk.remove());
      markers.current.clear();
      m.remove();
      map.current = null;
    };
  }, []);

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
        el.className = "marker";
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
    if (p) m.easeTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), 7.5), duration: 600 });
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
