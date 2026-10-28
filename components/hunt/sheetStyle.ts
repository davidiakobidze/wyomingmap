import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

// The base map for hunting pages, drawn like a survey sheet: warm paper,
// shaded relief lit from three directions, brown contours in feet, blue water,
// ink roads and labels. Vector data is OpenFreeMap (OpenStreetMap); elevation
// is the AWS Terrain Tiles set, shared by the hillshade and the contours.

export const C = {
  paper: "#f4efe3",
  ink: "#1f1d1a",
  contour: "#8a4b22",
  water: "#2c6a9a",
  waterFill: "#b9cfdc",
  plss: "#b3261e",
  rev: "#6b3fa0",
  field: "#5c6670",
  wood: "#dfe2c6",
  park: "#4f7a3a",
};

// Sequential ramp for "your chance" on the statewide maps, light to dark.
// Checked with the dataviz palette validator against the paper surface.
export const CHANCE_RAMP = ["#a88bcf", "#8c66bd", "#7148a6", "#552f8a", "#38185e"];
export const CHANCE_BINS = [0.05, 0.2, 0.5, 0.995]; // upper bounds of the first four steps
export const CHANCE_LABELS = ["Under 5%", "5–20%", "20–50%", "50–99%", "Sure"];
export function chanceColor(c: number): string {
  const i = CHANCE_BINS.findIndex((b) => c < b);
  return CHANCE_RAMP[i === -1 ? CHANCE_RAMP.length - 1 : i];
}

export const DEM_TILES = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";
export const DEM_MAXZOOM = 12;

const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];
const FONT_ITALIC = ["Noto Sans Italic"];
const halo = { "text-halo-color": C.paper, "text-halo-width": 1.6 };

export function sheetStyle(demUrl: string, contourUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
      dem: {
        type: "raster-dem",
        tiles: [demUrl],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: DEM_MAXZOOM,
        attribution: '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a>',
      },
      contours: { type: "vector", tiles: [contourUrl], maxzoom: 15 },
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": C.paper } },
      {
        id: "wood",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-color": C.wood, "fill-opacity": 0.45 },
      },
      {
        id: "relief",
        type: "hillshade",
        source: "dem",
        paint: {
          "hillshade-method": "multidirectional",
          "hillshade-illumination-direction": [315, 270, 0],
          "hillshade-illumination-altitude": [40, 50, 55],
          "hillshade-shadow-color": ["rgba(88,72,124,0.95)", "rgba(96,80,130,0.7)", "rgba(70,60,100,0.5)"],
          "hillshade-highlight-color": ["rgba(255,250,236,0.8)", "rgba(255,248,230,0.45)", "rgba(255,248,230,0.3)"],
          "hillshade-exaggeration": ["interpolate", ["linear"], ["zoom"], 5, 1, 9, 0.95, 13, 0.7],
        },
      },
      {
        id: "park",
        type: "line",
        source: "omt",
        "source-layer": "park",
        minzoom: 7,
        paint: { "line-color": C.park, "line-width": 1, "line-dasharray": [4, 2], "line-opacity": 0.55 },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": C.waterFill, "fill-outline-color": C.water },
      },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        minzoom: 7,
        paint: {
          "line-color": C.water,
          "line-opacity": 0.7,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.4, 12, 1.4],
        },
      },
      {
        id: "contour-minor",
        type: "line",
        source: "contours",
        "source-layer": "contours",
        filter: ["==", ["get", "level"], 0],
        minzoom: 8,
        paint: { "line-color": C.contour, "line-width": 0.6, "line-opacity": 0.55 },
      },
      {
        id: "contour-index",
        type: "line",
        source: "contours",
        "source-layer": "contours",
        filter: [">", ["get", "level"], 0],
        minzoom: 7,
        paint: { "line-color": C.contour, "line-width": 1.15, "line-opacity": 0.85 },
      },
      {
        id: "road-track",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 10,
        filter: ["in", ["get", "class"], ["literal", ["track", "path"]]],
        paint: { "line-color": C.ink, "line-width": 0.7, "line-dasharray": [3, 2], "line-opacity": 0.6 },
      },
      {
        id: "road-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 9,
        filter: ["in", ["get", "class"], ["literal", ["tertiary", "minor", "service"]]],
        paint: { "line-color": C.ink, "line-width": 0.5, "line-opacity": 0.55 },
      },
      {
        id: "road-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 6,
        filter: ["in", ["get", "class"], ["literal", ["primary", "secondary"]]],
        paint: { "line-color": C.ink, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 12, 1.6] },
      },
      {
        id: "road-highway",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk"]]],
        paint: { "line-color": C.plss, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 12, 2.4] },
      },
      {
        id: "state-line",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 4],
        paint: { "line-color": C.ink, "line-width": 1.2, "line-dasharray": [6, 2, 1, 2], "line-opacity": 0.7 },
      },
      // Hunt-area overlays are inserted here, under the labels.
      {
        id: "contour-label",
        type: "symbol",
        source: "contours",
        "source-layer": "contours",
        minzoom: 10,
        filter: [">", ["get", "level"], 0],
        layout: {
          "symbol-placement": "line",
          "text-field": ["concat", ["number-format", ["get", "ele"], {}], " ft"],
          "text-font": FONT,
          "text-size": 10,
        },
        paint: { "text-color": C.contour, ...halo },
      },
      {
        id: "water-name",
        type: "symbol",
        source: "omt",
        "source-layer": "water_name",
        minzoom: 8,
        layout: { "text-field": ["get", "name"], "text-font": FONT_ITALIC, "text-size": 11 },
        paint: { "text-color": C.water, ...halo },
      },
      {
        id: "river-name",
        type: "symbol",
        source: "omt",
        "source-layer": "waterway",
        minzoom: 10,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": FONT_ITALIC,
          "text-size": 10.5,
        },
        paint: { "text-color": C.water, ...halo },
      },
      {
        id: "peak",
        type: "symbol",
        source: "omt",
        "source-layer": "mountain_peak",
        minzoom: 8,
        filter: ["all", ["has", "name"], ["has", "ele_ft"]],
        layout: {
          "icon-image": "peak",
          "text-field": ["concat", ["get", "name"], "  ", ["number-format", ["get", "ele_ft"], {}], " ft"],
          "text-font": FONT_ITALIC,
          "text-size": 11.5,
          "text-anchor": "left",
          "text-offset": [0.7, 0],
          "symbol-sort-key": ["-", 0, ["get", "ele_ft"]],
        },
        paint: { "text-color": C.ink, ...halo },
      },
      {
        id: "town-dot",
        type: "circle",
        source: "omt",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["city", "town", "village"]]],
        paint: { "circle-color": C.ink, "circle-radius": 2.6, "circle-stroke-color": C.paper, "circle-stroke-width": 1 },
      },
      {
        id: "town",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["city", "town", "village"]]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["match", ["get", "class"], "city", ["literal", FONT_BOLD], ["literal", FONT]] as ExpressionSpecification,
          "text-size": ["match", ["get", "class"], "city", 13, "town", 12, 11],
          "text-anchor": "left",
          "text-offset": [0.6, 0],
          "symbol-sort-key": ["match", ["get", "class"], "city", 0, "town", 1, 2],
        },
        paint: { "text-color": C.ink, ...halo },
      },
    ],
  };
}
