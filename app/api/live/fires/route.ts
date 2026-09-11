import { NextResponse } from "next/server";
import type { Feature, MultiPolygon, Point, Polygon } from "geojson";
import { FireProps, FiresFeed, WYOMING_BBOX } from "@/lib/live";

// Wildfire incidents and perimeters from NIFC's WFIGS open-data services.
// No key required. Upstream is cached for 10 minutes via the fetch cache;
// if a revalidation fails, Next keeps serving the last good response.
// The route itself is dynamic so a NIFC outage can't break `next build`.
export const dynamic = "force-dynamic";

// Overridable so an outage can be simulated locally (point it at a dead port).
const NIFC =
  process.env.NIFC_BASE_URL ??
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services";
const REVALIDATE_SECONDS = 600;

// Upstream ArcGIS layers and the fields we read from each. The perimeter layer
// prefixes the same attributes with `attr_` (and the name with `poly_`).
const POINTS = {
  url: `${NIFC}/WFIGS_Incident_Locations_Current/FeatureServer/0/query`,
  fields: [
    "UniqueFireIdentifier",
    "IncidentName",
    "IncidentSize",
    "PercentContained",
    "FireDiscoveryDateTime",
    "ModifiedOnDateTime_dt",
    "IncidentTypeCategory",
  ],
};
const PERIMETERS = {
  url: `${NIFC}/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query`,
  fields: [
    "attr_UniqueFireIdentifier",
    "poly_IncidentName",
    "attr_IncidentSize",
    "attr_PercentContained",
    "attr_FireDiscoveryDateTime",
    "attr_ModifiedOnDateTime_dt",
  ],
};

type RawProps = Record<string, unknown>;

function query(url: string, fields: string[]) {
  const params = new URLSearchParams({
    where: "1=1",
    geometry: WYOMING_BBOX,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: fields.join(","),
    outSR: "4326",
    f: "geojson",
  });
  return fetch(`${url}?${params}`, { next: { revalidate: REVALIDATE_SECONDS } });
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const iso = (v: unknown) => (typeof v === "number" ? new Date(v).toISOString() : null);

function normalize(p: RawProps, prefix: "" | "attr_"): FireProps {
  const namePrefix = prefix === "attr_" ? "poly_" : "";
  return {
    id: str(p[`${prefix}UniqueFireIdentifier`]) ?? "unknown",
    name: str(p[`${namePrefix}IncidentName`]) ?? "Unnamed fire",
    acres: num(p[`${prefix}IncidentSize`]),
    contained: num(p[`${prefix}PercentContained`]),
    discovered: iso(p[`${prefix}FireDiscoveryDateTime`]),
    updated: iso(p[`${prefix}ModifiedOnDateTime_dt`]),
  };
}

async function readFeatures(res: Response, label: string): Promise<Feature[]> {
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  const body = await res.json();
  // ArcGIS reports many failures as a 200 with an `error` object.
  if (body?.error) throw new Error(`${label}: ${body.error.message ?? "upstream error"}`);
  if (!Array.isArray(body?.features)) throw new Error(`${label}: unexpected response shape`);
  return body.features;
}

export async function GET() {
  const fetchedAt = new Date().toISOString();
  try {
    const [pointsRes, perimsRes] = await Promise.all([
      query(POINTS.url, POINTS.fields),
      query(PERIMETERS.url, PERIMETERS.fields),
    ]);
    const [rawPoints, rawPerims] = await Promise.all([
      readFeatures(pointsRes, "NIFC incidents"),
      readFeatures(perimsRes, "NIFC perimeters"),
    ]);

    // WF = wildfire, CX = complex of wildfires. RX (prescribed burns) are
    // planned and managed; they are noise for a visitor deciding where to go.
    const incidents = rawPoints
      .filter((f) => {
        const cat = (f.properties as RawProps)?.IncidentTypeCategory;
        return f.geometry?.type === "Point" && (cat === "WF" || cat === "CX");
      })
      .map(
        (f): Feature<Point, FireProps> => ({
          type: "Feature",
          geometry: f.geometry as Point,
          properties: normalize(f.properties as RawProps, ""),
        })
      )
      .sort((a, b) => (b.properties.acres ?? 0) - (a.properties.acres ?? 0));

    const perimeters = rawPerims
      .filter((f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
      .map(
        (f): Feature<Polygon | MultiPolygon, FireProps> => ({
          type: "Feature",
          geometry: f.geometry as Polygon | MultiPolygon,
          properties: normalize(f.properties as RawProps, "attr_"),
        })
      );

    const feed: FiresFeed = {
      ok: true,
      fetchedAt,
      source: "NIFC WFIGS",
      incidents: { type: "FeatureCollection", features: incidents },
      perimeters: { type: "FeatureCollection", features: perimeters },
    };
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[live/fires]", message);
    const feed: FiresFeed = { ok: false, fetchedAt, error: message };
    // 200 on purpose: the client treats ok:false as "unavailable" and keeps
    // the rest of the map working. Not cached, so it recovers on next request.
    return NextResponse.json(feed, { headers: { "Cache-Control": "no-store" } });
  }
}
