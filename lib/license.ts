import type { LicenseHarvest } from "@/lib/harvest";
import { DemandDraw, PointsDraw, PointsKey, chanceAt, combinedOdds, firstChoiceChance, pointsKey } from "@/lib/hunts";

// One license as the draw board shows it. Server pages build these from the
// species data; the board picks which draw to tell from what is present.
export interface License {
  id: string; // anchor of its detail section: "type-1", "general"
  kicker: string; // "Type 1", "Region G"
  title: string; // "Any elk", "General license"
  serial: string; // "E-007-1", printed on the coupon
  points?: PointsDraw; // nonresident preference-point draw
  random?: DemandDraw; // the random draw its losers go into
  demand?: DemandDraw; // a random-only draw (cow/calf, doe/fawn)
  demandWho?: "Nonresident" | "Resident";
  resident?: DemandDraw;
  note?: string; // a line for the coupon stub, e.g. season dates
  harvest?: LicenseHarvest; // how its hunters did the season before the draw
}

// A license's random-only draw, nonresident first, else resident.
export function demandOf(l: License): { d: DemandDraw; who: "Nonresident" | "Resident" } | null {
  if (l.demand) return { d: l.demand, who: l.demandWho ?? "Nonresident" };
  if (!l.points && l.resident) return { d: l.resident, who: "Resident" };
  return null;
}

// What decides a nonresident's chance at a license, for maps and tables: a
// preference-point draw (`k`), or a random draw where points do not matter
// (`c`, 0..1). Null for resident-only licenses and draws nobody entered.
export type AreaOdds = { k: PointsKey; label: string } | { c: number; label: string };

export function oddsOf(l: License): AreaOdds | null {
  if (l.points) {
    const k = pointsKey(combinedOdds(l.points, l.random));
    return k && { k, label: l.kicker };
  }
  const d = demandOf(l);
  const c = d?.who === "Nonresident" ? firstChoiceChance(d.d) : null;
  return c === null ? null : { c: c / 100, label: l.kicker };
}

export function chanceOf(o: AreaOdds, pts: number): number {
  return "k" in o ? chanceAt(o.k, pts) : o.c;
}

// Whole points that were sure to draw on points: 0 when anyone could draw
// (or points did not matter), undefined when no level was sure.
export function sureFrom(o: AreaOdds | null): number | undefined {
  if (!o) return undefined;
  if (!("k" in o)) return 0;
  const { cut, sure } = o.k;
  if (cut !== null) return Math.floor(cut) + 1;
  return sure === null ? undefined : Math.ceil(sure);
}
