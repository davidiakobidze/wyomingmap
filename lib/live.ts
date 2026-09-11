import type { FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";

// Everything the map draws from a live feed goes through one of these shapes,
// so the client never has to know what an upstream API looks like.

export interface FireProps {
  id: string;
  name: string;
  acres: number | null;
  contained: number | null; // percent, 0-100
  discovered: string | null; // ISO
  updated: string | null; // ISO
}

export type FireIncidents = FeatureCollection<Point, FireProps>;
export type FirePerimeters = FeatureCollection<Polygon | MultiPolygon, FireProps>;

export type FiresFeed =
  | {
      ok: true;
      fetchedAt: string;
      source: string;
      incidents: FireIncidents;
      perimeters: FirePerimeters;
    }
  | {
      ok: false;
      fetchedAt: string;
      error: string;
    };

// Lng/lat envelope around Wyoming, padded a little so a fire just over the
// Montana line near the Northeast Entrance still shows up.
export const WYOMING_BBOX = "-111.2,40.9,-104.0,45.1";
