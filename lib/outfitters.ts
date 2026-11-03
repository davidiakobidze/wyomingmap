import raw from "@/data/outfitter-listings.json";

// Outfitters listed on the hunt sheets, entered by hand from their replies in
// data/outfitter-listings.json. Each one names the areas it is licensed in
// (checked against its Wyoming outfitter license) and shows on those sheets.

export interface OutfitterListing {
  license: string; // Wyoming outfitter license, "BG102"
  business: string;
  name: string; // the outfitter's own name
  town: string;
  blurb: string; // a sentence about their hunts, in their words
  url: string;
  photo?: string; // path under /public, e.g. "/outfitters/bg102.jpg"
  elk?: number[]; // elk hunt areas
  deer?: number[]; // deer hunt areas
  until: string; // ISO date the listing runs to; past it, it stops showing
}

const LISTINGS = (raw as { listings: OutfitterListing[] }).listings;

// Pages are built at deploy time, so a listing drops off at the first deploy after it ends.
const live = (l: OutfitterListing) => new Date(`${l.until}T23:59:59Z`) >= new Date();

export function outfittersIn(species: "elk" | "deer", areas: number[]): OutfitterListing[] {
  return LISTINGS.filter((l) => live(l) && (l[species] ?? []).some((a) => areas.includes(a))).sort((a, b) =>
    a.business.localeCompare(b.business)
  );
}
