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

const num = new Intl.NumberFormat("en-US");

// Points needed for a sure tag, as a number for sorting; null when anyone could draw.
export function pointsNeeded(d?: PointsDraw): number | null {
  if (!d || d.quota === 0 || d.summary.applicants === 0 || d.summary.allDrew) return null;
  if (d.summary.partial) return pointsValue(d.summary.partial.points);
  return d.summary.lowestSure ? pointsValue(d.summary.lowestSure) : null;
}

// Wyoming's nonresident licenses go 75% to the preference-point draw and 25%
// to a random draw. Everyone who misses the point draw is entered in the
// random draw (in every 2026 report the random draw's first-choice applicants
// are exactly the point draw's unsuccessful applicants; the build script
// checks this), so a hunter's real chance at a point level is the point-draw
// result plus the random-draw chance for the rest. WGFD prints only the first.
export interface CombinedRow {
  points: string; // as WGFD prints it
  applicants: number;
  drew: number; // licenses issued in the point draw
  printed: number; // WGFD's printed odds, percent: licenses left / applicants
  combined: number; // 0..1, point draw plus random draw
}

export interface CombinedOdds {
  applicants: number;
  drew: number;
  losers: number; // missed the point draw, so entered the random draw
  randomQuota: number;
  random: number | null; // 0..1 chance in the random draw; null when nobody missed
  rows: CombinedRow[]; // point levels anyone applied at, highest first
  cut: CombinedRow | null; // the level where the point draw ran out, if it ran out mid-level
  sure: CombinedRow | null; // the lowest level where everyone drew in the point draw
  floor: CombinedRow | null; // the lowest level anyone applied at
}

export function combinedOdds(p: PointsDraw, r?: DemandDraw): CombinedOdds {
  const applied = p.rows.filter((x) => x.applicants > 0);
  const applicants = applied.reduce((n, x) => n + x.applicants, 0);
  const drew = applied.reduce((n, x) => n + x.issued, 0);
  const losers = r ? r.first : applicants - drew;
  const randomQuota = r?.quota ?? 0;
  const random = losers > 0 ? Math.min(1, randomQuota / losers) : null;
  // WGFD's printed odds at the cut level are licenses left over applicants;
  // the issued count is what happened (sometimes more, likely parties drawn
  // together), and it is what the random pool reconciles with.
  const rows = applied.map((x) => {
    const pd = x.issued / x.applicants;
    return {
      points: x.points,
      applicants: x.applicants,
      drew: x.issued,
      printed: x.odds,
      combined: pd + (1 - pd) * (random ?? 0),
    };
  });
  const cut = rows.find((x) => x.drew > 0 && x.drew < x.applicants) ?? null;
  const sure = [...rows].reverse().find((x) => x.drew === x.applicants) ?? null;
  return { applicants, drew, losers, randomQuota, random, rows, cut, sure, floor: rows[rows.length - 1] ?? null };
}

// What a hunter's own point count decides in one draw, small enough to hand
// to client components: the level where the point draw ran out and the chance
// there, the lowest level where everyone drew, and the random-draw chance.
// Point values are as pointsValue gives them, so "< 15" is 14.5.
export interface PointsKey {
  cut: number | null;
  cutChance: number;
  sure: number | null;
  random: number;
}

// Null when nobody applied, so there is nothing to say about anyone's chance.
export function pointsKey(o: CombinedOdds): PointsKey | null {
  if (o.applicants === 0) return null;
  if (o.losers === 0) return { cut: null, cutChance: 1, sure: 0, random: 1 };
  return {
    cut: o.cut ? pointsValue(o.cut.points) : null,
    cutChance: o.cut?.combined ?? 0,
    sure: o.sure ? pointsValue(o.sure.points) : null,
    random: o.random ?? 0,
  };
}

// A hunter with exactly `p` points (applying alone) in that draw: sure above
// the cut, the cut level's chance at it, and the random draw below.
export function chanceAt(k: PointsKey, p: number): number {
  if (k.cut !== null) return p > k.cut ? 1 : p === k.cut ? k.cutChance : k.random;
  return k.sure !== null && p >= k.sure ? 1 : k.random;
}

// "about 30%" or, for long shots, "about 1 in 44" (counts read better than small percentages).
export function chanceText(c: number): string {
  if (c >= 0.995) return "a sure thing";
  if (c >= 0.1) return `about ${Math.round(c * 100)}%`;
  if (c <= 0) return "none";
  const n = Math.round(1 / c);
  return n > 1000 ? "under 1 in 1,000" : `about 1 in ${num.format(n)}`;
}

// The short form for table cells.
export function chanceShort(c: number): string {
  if (c >= 0.995) return "100%";
  if (c >= 0.1) return `${Math.round(c * 100)}%`;
  if (c <= 0) return "0";
  const n = Math.round(1 / c);
  return n > 1000 ? "<1 in 1,000" : `1 in ${num.format(n)}`;
}

const at = (x: CombinedRow) => points(pointsLabel(x.points));

// The whole draw in plain language: point draw, random draw, and the two combined.
export function combinedSentence(o: CombinedOdds): string {
  if (o.applicants === 0) return "Nobody applied for it as a first choice.";
  if (o.losers === 0) return `All ${num.format(o.applicants)} first-choice applicants drew in the point draw.`;
  if (o.drew === 0 && o.randomQuota === 0) {
    return `No licenses were available in either draw, so none of the ${num.format(o.applicants)} first-choice applicants drew.`;
  }
  const parts: string[] = [];
  if (o.cut) {
    parts.push(
      `The point draw ran out at ${at(o.cut)}, where ${num.format(o.cut.drew)} of ${num.format(o.cut.applicants)} drew; everyone with more points drew.`
    );
  } else if (o.sure) {
    parts.push(`Everyone with ${at(o.sure)} or more drew in the point draw; nobody below that did.`);
  } else {
    parts.push("Nobody drew in the point draw.");
  }
  if (o.randomQuota === 0) {
    parts.push(`There were no random-draw licenses, so the ${num.format(o.losers)} who missed went home empty.`);
    return parts.join(" ");
  }
  const lucky = Math.min(o.randomQuota, o.losers);
  parts.push(
    `The ${num.format(o.losers)} who missed went into the random draw, where ${num.format(lucky)} of them drew.`
  );
  const random = o.random ?? 0;
  if (random >= 0.995) {
    parts.push("Counting both draws, every applicant drew.");
  } else if (o.cut && o.cut !== o.floor) {
    parts.push(
      `Counting both draws, a hunter at ${at(o.cut)} had a chance of ${chanceText(o.cut.combined)}, and one with fewer points ${chanceText(random)}.`
    );
  } else if (o.cut) {
    // The draw ran out at the lowest level anyone applied at, so there is no "fewer".
    parts.push(`Counting both draws, a hunter at ${at(o.cut)} had a chance of ${chanceText(o.cut.combined)}.`);
  } else {
    parts.push(
      `Counting both draws, ${o.sure ? "a hunter below that" : "every applicant"} had a chance of ${chanceText(random)}.`
    );
  }
  return parts.join(" ");
}

// For headlines: "nonresidents needed about 12 preference points; with fewer,
// the random draw gave a chance of about 1 in 42".
export function nonresidentPhrase(p: PointsDraw, r?: DemandDraw): string {
  const o = combinedOdds(p, r);
  if (o.applicants === 0) return "no nonresident applied for it as a first choice";
  if (o.losers === 0) return "every nonresident who applied drew";
  if (o.drew === 0 && o.randomQuota === 0) {
    return `there were no nonresident licenses, though ${num.format(o.applicants)} nonresidents applied for it as a first choice`;
  }
  const need = pointsNeeded(p);
  if (need === null || need < 1) {
    if (o.floor && o.floor.combined >= 0.995) return "every nonresident who applied drew in the point or random draw";
    return o.floor
      ? `a nonresident with no preference points had a chance of ${chanceText(o.floor.combined)} across the point and random draws`
      : "nonresidents drew with any number of preference points";
  }
  const base = `nonresidents needed about ${preferencePoints(Math.ceil(need))}`;
  if (o.randomQuota === 0) return `${base}, and the random draw had no licenses`;
  if ((o.random ?? 0) >= 0.995) return `${base}, and everyone with fewer drew in the random draw`;
  return `${base}; with fewer, the random draw gave a chance of ${chanceText(o.random ?? 0)}`;
}

// A nonresident's chance with no points: the random draw alone, unless even
// the lowest level drew in the point draw. Null when nobody applied.
export function zeroPointChance(p?: PointsDraw, r?: DemandDraw): number | null {
  if (!p) return null;
  return combinedOdds(p, r).floor?.combined ?? null;
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

// "In the 2026 draw for X," + ["nonresidents needed ...", "residents' odds ..."]
// as "In the 2026 draw for X, nonresidents needed .... Residents' odds ...."
export function sentences(lead: string, parts: string[]): string {
  const [first, ...rest] = parts;
  return [`${lead} ${first}.`, ...rest.map((x) => `${x[0].toUpperCase()}${x.slice(1)}.`)].join(" ");
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
