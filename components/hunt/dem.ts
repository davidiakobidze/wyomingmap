import maplibregl from "maplibre-gl";
import mlcontour from "maplibre-contour";
import { DEM_MAXZOOM, DEM_TILES } from "./sheetStyle";

// One DEM source for the whole page: every map's relief, terrain and contour
// lines read the same cached tiles, and contours are traced in a web worker.
let dem: InstanceType<typeof mlcontour.DemSource> | null = null;
export function demSource() {
  if (!dem) {
    dem = new mlcontour.DemSource({ url: DEM_TILES, encoding: "terrarium", maxzoom: DEM_MAXZOOM, worker: true });
    dem.setupMaplibre(maplibregl);
  }
  return dem;
}

// Feet, with an index line every fifth contour, as on a USGS quad.
export const CONTOURS = {
  multiplier: 3.28084,
  thresholds: { 7: [1000, 5000], 8: [500, 2500], 9: [200, 1000], 11: [100, 500], 12: [40, 200] },
  elevationKey: "ele",
  levelKey: "level",
  contourLayer: "contours",
};
