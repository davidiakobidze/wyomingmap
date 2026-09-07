"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Project, TYPE_COLORS } from "@/lib/projects";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const WYOMING_BOUNDS: [[number, number], [number, number]] = [
  [-111.2, 40.9],
  [-104.0, 45.1],
];

export default function ProjectMap({
  projects,
  activeSlug,
  onSelect,
}: {
  projects: Project[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!container.current || map.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      bounds: WYOMING_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const wanted = new Set(projects.map((p) => p.slug));
    markers.current.forEach((mk, slug) => {
      if (!wanted.has(slug)) {
        mk.remove();
        markers.current.delete(slug);
      }
    });
    projects.forEach((p) => {
      let mk = markers.current.get(p.slug);
      if (!mk) {
        const el = document.createElement("button");
        el.className = "marker";
        el.title = p.name;
        el.setAttribute("aria-label", p.name);
        el.style.background = TYPE_COLORS[p.type];
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(p.slug);
        });
        mk = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
        markers.current.set(p.slug, mk);
      }
      mk.getElement().classList.toggle("active", p.slug === activeSlug);
    });
  }, [projects, activeSlug, onSelect]);

  useEffect(() => {
    const m = map.current;
    if (!m || !activeSlug) return;
    const p = projects.find((x) => x.slug === activeSlug);
    if (p) m.easeTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), 7.5), duration: 600 });
  }, [activeSlug, projects]);

  return <div ref={container} className="map" />;
}
