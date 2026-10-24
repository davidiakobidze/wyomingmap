import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Bounds } from "@/lib/site";

// Shapes and wording shared by every species' hunt-area pages. The data comes
// from scripts/hunts/build_hunt_data.py; see lib/elk.ts and lib/deer.ts.

export interface PointsRow {
  points: string; // as WGFD prints it: "14", "< 15", "<= 3"
  issued: number;
  applicants: number;
  odds: number; // percent
}

export interface PointsDraw {
  quota: number;
  rows: PointsRow[];
  summary: {
    partial: { points: string; odds: number } | null;
    lowestSure: string | null;
    allDrew: boolean;
    applicants: number;
  };
}

export interface DemandDraw {
  quota: number;
  first: number;
  second: number;
  third: number;
}

// Nonresident general licenses, drawn by region rather than by area.
export interface RegionDraws {
  nrPoints?: PointsDraw;
  nrRandom?: DemandDraw;
  nrSpecialPoints?: PointsDraw;
  nrSpecialRandom?: DemandDraw;
}

export interface MapArea {
  area: number;
  name: string;
  bbox: Bounds;
  geometry: Geometry;
}

// "< 15" sits between 14 and 15 points; sort and compare it as 14.5.
export function pointsValue(label: string): number {
  const n = Number(label.replace(/[<=\s]/g, ""));
  return label.startsWith("<=") ? n : label.startsWith("<") ? n - 0.5 : n;
}

export function pointsLabel(label: string): string {
  if (label.startsWith("<=")) return `${label.replace(/[<=\s]/g, "")} or fewer`;
  if (label.startsWith("<")) return `just under ${label.replace(/[<\s]/g, "")}`;
  return label;
}

// "1 point", "just under 1 point", "12 points".
export const points = (label: string) => `${label} point${/(^|\D)1$/.test(label) ? "" : "s"}`;
export const preferencePoints = (n: number) => `${n} preference point${n === 1 ? "" : "s"}`;

const pct = (n: number) => `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;

// One sentence a hunter can act on, from WGFD's preference-point table.
export function pointsSentence(d: PointsDraw): string {
  const s = d.summary;
  if (d.quota === 0) return "No licenses were set aside for the preference-point draw.";
  if (s.applicants === 0) return "Nobody applied for it as a first choice.";
  if (s.allDrew) return "Every applicant drew, whatever their points.";
  if (s.partial) {
    const at = pointsLabel(s.partial.points);
    return `The draw ran out at ${points(at)}: ${pct(s.partial.odds)} of applicants there drew, and everyone above it drew.`;
  }
  if (s.lowestSure) return `Everyone with ${points(pointsLabel(s.lowestSure))} or more drew; nobody below that did.`;
  return "Nobody drew.";
}

// Points needed for a sure tag, as a number for sorting; null when anyone could draw.
export function pointsNeeded(d?: PointsDraw): number | null {
  if (!d || d.quota === 0 || d.summary.applicants === 0 || d.summary.allDrew) return null;
  if (d.summary.partial) return pointsValue(d.summary.partial.points);
  return d.summary.lowestSure ? pointsValue(d.summary.lowestSure) : null;
}

// "about 12 preference points", or for a draw that ran out below one point,
// "1 preference point to be sure of drawing (2.1% of those with fewer drew)".
// Null when anyone could draw.
export function pointsNeededPhrase(d: PointsDraw): string | null {
  const need = pointsNeeded(d);
  if (need === null) return null;
  const partial = d.summary.partial;
  if (need < 1 && partial) return `1 preference point to be sure of drawing (${pct(partial.odds)} of those with fewer drew)`;
  return `about ${preferencePoints(Math.ceil(need))}`;
}

// "nonresidents needed about 12 preference points", for headlines.
export function pointsPhrase(d: PointsDraw): string {
  const need = pointsNeededPhrase(d);
  return need === null ? "nonresidents drew with any number of preference points" : `nonresidents needed ${need}`;
}

// Random and resident draws publish quota and applicant counts, not odds. If
// every license went to a first-choice applicant, this is their chance.
export function firstChoiceChance(d?: DemandDraw): number | null {
  if (!d || d.first === 0) return null;
  return Math.min(100, (d.quota / d.first) * 100);
}

export function chanceLabel(c: number | null): string {
  if (c === null) return "no first-choice applicants";
  if (c >= 100) return "everyone drew";
  if (c < 1) return "under 1%";
  return `about ${Math.round(c)}%`;
}

export function oddsPhrase(who: "resident" | "nonresident", d: DemandDraw): string {
  const c = firstChoiceChance(d);
  if (c === null) return `no ${who} applied for it as a first choice`;
  if (c >= 100) return `there were enough licenses for every ${who} who put it first`;
  return `${who}s' first-choice odds were ${chanceLabel(c)}`;
}

function intersects(a: Bounds, b: Bounds) {
  return a[0][0] <= b[1][0] && b[0][0] <= a[1][0] && a[0][1] <= b[1][1] && b[0][1] <= a[1][1];
}

export function neighborsIn<T extends MapArea>(all: T[], a: T): T[] {
  return all.filter((o) => o.area !== a.area && intersects(a.bbox, o.bbox));
}

// The box around several areas, for framing a region on the map.
export function unionBounds(areas: MapArea[]): Bounds {
  return [
    [Math.min(...areas.map((a) => a.bbox[0][0])), Math.min(...areas.map((a) => a.bbox[0][1]))],
    [Math.max(...areas.map((a) => a.bbox[1][0])), Math.max(...areas.map((a) => a.bbox[1][1]))],
  ];
}

export function areaFeature(a: MapArea, extra: Record<string, unknown> = {}): Feature {
  return { type: "Feature", properties: { area: a.area, name: a.name, ...extra }, geometry: a.geometry };
}

export function collection(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

// A point to hang the area's marker on: the average of the outer ring. Good
// enough for these mostly convex shapes; it is a click target, not a survey.
export function labelPoint(a: MapArea): { lat: number; lng: number } {
  const g = a.geometry;
  const ring =
    g.type === "Polygon"
      ? g.coordinates[0]
      : g.type === "MultiPolygon"
        ? g.coordinates.reduce((best, p) => (p[0].length > best.length ? p[0] : best), g.coordinates[0][0])
        : [];
  const n = ring.length || 1;
  const [x, y] = ring.reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0]);
  return { lng: x / n, lat: y / n };
}

export function marker(a: MapArea) {
  return { area: a.area, name: a.name, ...labelPoint(a) };
}
