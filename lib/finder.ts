import { DEER_AREAS, DEER_REGIONS, deerLicenses, deerPath, regionLicenses, regionPath } from "@/lib/deer";
import { ELK_AREAS, ELK_REGIONS, elkLicenses, elkPath, elkRegionLicense } from "@/lib/elk";
import { deerAreaHarvest, deerLicenseHarvest, elkAreaHarvest, elkLicenseHarvest, LicenseHarvest } from "@/lib/harvest";
import { firstChoiceChance } from "@/lib/hunts";
import { AreaOdds, License, oddsOf } from "@/lib/license";
import type { Species } from "@/lib/points";

// The hunt finder's rows: every license a hunter could put in for, with what
// decides their chance and how its hunters did the season before. Built on
// the server from the species data; small enough to hand to the client.

export type HuntKind = "general" | "antlered" | "antlerless";

export interface FinderRow {
  key: string;
  num: string; // area number or region letter
  name: string;
  href: string;
  license: string; // "Type 1 · Any elk", "Region G general license"
  season?: string;
  kind: HuntKind;
  nonresident: AreaOdds | null; // what decides a nonresident's chance; null when they can't apply
  resident: number | null; // a resident's first-choice chance, 0..1; null when they can't apply
  harvest?: LicenseHarvest;
}

const ANTLERLESS = /cow|calf|doe|fawn|antlerless/i;

function row(l: License, o: { key: string; num: string; name: string; href: string; resident?: number | null }): FinderRow {
  const res = l.resident ? firstChoiceChance(l.resident) : null;
  return {
    key: o.key,
    num: o.num,
    name: o.name,
    href: `${o.href}#${l.id}`,
    license: `${l.kicker} · ${l.title}`,
    season: l.note,
    kind: l.id === "general" || l.id === "special" ? "general" : ANTLERLESS.test(l.title) ? "antlerless" : "antlered",
    nonresident: oddsOf(l),
    resident: o.resident !== undefined ? o.resident : res === null ? null : res / 100,
    harvest: l.harvest,
  };
}

// Residents hunt general seasons over the counter: sure, and only for them.
function residentGeneral(o: { key: string; num: string; name: string; href: string; season: string; harvest?: LicenseHarvest }): FinderRow {
  return {
    key: o.key,
    num: o.num,
    name: o.name,
    href: `${o.href}#general`,
    license: "General season · over the counter",
    season: o.season,
    kind: "general",
    nonresident: null,
    resident: 1,
    harvest: o.harvest,
  };
}

function elkRows(): FinderRow[] {
  const out: FinderRow[] = [];
  ELK_REGIONS.forEach((region) => {
    const l = elkRegionLicense(region);
    const areas = ELK_AREAS.filter((a) => a.region === region && a.general.length > 0).length;
    if (l)
      out.push({
        ...row(l, { key: `r-${region}`, num: region[0], name: `${region} region`, href: "/hunting/elk", resident: null }),
        href: "/hunting/elk",
        license: `${region} region general license · ${areas} areas`,
      });
  });
  ELK_AREAS.forEach((a) => {
    if (a.closed) return;
    const base = { num: String(a.area), name: a.name, href: elkPath(a) };
    if (a.general.length > 0) {
      out.push(
        residentGeneral({
          ...base,
          key: `${a.area}-gen`,
          season: elkLicenses(a)[0]?.note ?? "",
          harvest: elkLicenseHarvest(elkAreaHarvest(a.area)?.types.GEN),
        })
      );
    }
    elkLicenses(a)
      .filter((l) => l.id !== "general")
      .forEach((l) => out.push(row(l, { ...base, key: `${a.area}-${l.id}` })));
  });
  return out;
}

function deerRows(): FinderRow[] {
  const out: FinderRow[] = [];
  DEER_REGIONS.forEach((r) => {
    regionLicenses(r).forEach((l) =>
      out.push({
        ...row(l, { key: `r-${r.region}-${l.id}`, num: r.region, name: `Region ${r.region}`, href: regionPath(r.region), resident: null }),
        href: regionPath(r.region),
        license: `${l.title} · ${r.generalAreas.length} areas`,
      })
    );
  });
  DEER_AREAS.forEach((a) => {
    if (a.closed) return;
    const base = { num: String(a.area), name: a.name, href: deerPath(a) };
    if (a.general.length > 0) {
      const by = deerAreaHarvest(a.area);
      out.push(
        residentGeneral({
          ...base,
          key: `${a.area}-gen`,
          season: `${a.general[0].opens} to ${a.general[0].closes}`,
          harvest: deerLicenseHarvest({ mule: by.mule?.types.GEN, whitetail: by.whitetail?.types.GEN }),
        })
      );
    }
    deerLicenses(a)
      .filter((l) => l.id !== "general")
      .forEach((l) => out.push(row(l, { ...base, key: `${a.area}-${l.id}` })));
  });
  return out;
}

export const finderRows = (s: Species): FinderRow[] => (s === "elk" ? elkRows() : deerRows());
export const finderPath = (s: Species) => `/hunting/${s}/finder`;
