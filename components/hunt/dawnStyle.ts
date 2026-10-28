import type { ExpressionSpecification, SkySpecification, StyleSpecification } from "maplibre-gl";
import { DEM_MAXZOOM } from "./sheetStyle";

// The hero map: the same terrain as the sheet map, lit as the hour before
// sunrise on opening morning. Every colour has a night and a dawn value, and
// the scroll mixes between them.

export const NIGHT = {
  hi: "#33426e", sh: "#03050b", ac: "#0b1222", lo: "#0d1424", mid: "#141c33", top: "#2f3d63", peak: "#3a4566",
  water: "#0c1a33", sky: "#060a16", hz: "#18203a", fog: "#060a16", contour: 0.1,
};
export const DAWN = {
  hi: "#ffd9a0", sh: "#2a1b30", ac: "#6b3f4e", lo: "#3a2e44", mid: "#8a6a70", top: "#e7b58c", peak: "#fff1dc",
  water: "#4a6f99", sky: "#6f93c4", hz: "#ffb070", fog: "#d9a07e", contour: 0.32,
};
export const GOLD = "#ffd27a";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`;
}
export const at = (k: keyof typeof NIGHT, t: number) => mix(NIGHT[k] as string, DAWN[k] as string, t);

// Hypsometric tint in metres: Wyoming runs from about 1,000 m to 4,200 m.
export const relief = (t: number): ExpressionSpecification => [
  "interpolate", ["linear"], ["elevation"],
  1000, at("lo", t), 2200, at("mid", t), 3000, at("top", t), 4000, at("peak", t),
];

export const sky = (t: number): SkySpecification => ({
  "sky-color": at("sky", t),
  "horizon-color": at("hz", t),
  "fog-color": at("fog", t),
  "sky-horizon-blend": 0.6,
  "horizon-fog-blend": 0.6,
  "fog-ground-blend": 0.4,
  "atmosphere-blend": 0,
});

export const contourOpacity = (t: number): ExpressionSpecification => {
  const o = lerp(NIGHT.contour, DAWN.contour, t);
  return ["match", ["get", "level"], 1, o * 1.6, o];
};

// The area's outline drawn from its start to `d` (0 to 1) of the way round.
// `rgb` is gold for the line itself, a dark plum for the casing under it.
export const drawn = (d: number, alpha: number, rgb = "255,210,122"): ExpressionSpecification => [
  "step", ["line-progress"], `rgba(${rgb},${alpha})`, Math.max(0.0001, Math.min(0.9999, d)), `rgba(${rgb},0)`,
];

export function dawnStyle(demUrl: string, contourUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sky: sky(0),
    sources: {
      omt: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
      // Terrain and shading read the same tiles, but MapLibre wants them as two sources.
      terrain: { type: "raster-dem", tiles: [demUrl], encoding: "terrarium", tileSize: 256, maxzoom: DEM_MAXZOOM,
        attribution: '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a>' },
      dem: { type: "raster-dem", tiles: [demUrl], encoding: "terrarium", tileSize: 256, maxzoom: DEM_MAXZOOM },
      contours: { type: "vector", tiles: [contourUrl], maxzoom: 15 },
    },
    terrain: { source: "terrain", exaggeration: 1.6 },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": NIGHT.lo } },
      { id: "relief", type: "color-relief", source: "dem", paint: { "color-relief-color": relief(0) } },
      {
        id: "shade", type: "hillshade", source: "dem",
        paint: {
          "hillshade-method": "basic",
          "hillshade-illumination-anchor": "map",
          "hillshade-illumination-direction": 80,
          "hillshade-illumination-altitude": 4,
          "hillshade-exaggeration": 0.85,
          "hillshade-highlight-color": NIGHT.hi,
          "hillshade-shadow-color": NIGHT.sh,
          "hillshade-accent-color": NIGHT.ac,
        },
      },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": NIGHT.water } },
      { id: "river", type: "line", source: "omt", "source-layer": "waterway", minzoom: 7, paint: { "line-color": NIGHT.water, "line-width": 1 } },
      {
        id: "contour", type: "line", source: "contours", "source-layer": "contours",
        paint: { "line-color": GOLD, "line-opacity": contourOpacity(0), "line-width": ["match", ["get", "level"], 1, 0.9, 0.45] },
      },
      {
        id: "towns", type: "symbol", source: "omt", "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-letter-spacing": 0.14, "text-transform": "uppercase" },
        paint: { "text-color": "rgba(244,239,230,0.75)", "text-halo-color": "rgba(10,15,28,0.85)", "text-halo-width": 1.6, "text-halo-blur": 0.4 },
      },
    ],
  };
}
