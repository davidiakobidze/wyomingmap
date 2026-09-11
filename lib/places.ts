import raw from "@/data/places.json";

export type PlaceCategory = "park" | "scenic-drive" | "photo-spot";

export interface Place {
  slug: string;
  name: string;
  category: PlaceCategory;
  region: string;
  lat: number;
  lng: number;
  summary: string;
  season?: string;
  link?: string;
}

export const places = raw as Place[];

export const CATEGORY_ORDER: PlaceCategory[] = ["park", "scenic-drive", "photo-spot"];

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  park: "Parks & entrances",
  "scenic-drive": "Scenic drives",
  "photo-spot": "Photo spots",
};

export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  park: "#3f7d4e",
  "scenic-drive": "#b8862b",
  "photo-spot": "#7b5ca6", // plum; red is reserved for live wildfires
};
