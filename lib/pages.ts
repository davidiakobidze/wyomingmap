import { Place, PlaceCategory, CATEGORY_ORDER } from "@/lib/places";
import { Bounds, WYOMING_BOUNDS } from "@/lib/site";

// Themed landing pages. Each one is the same map, scoped and focused, with
// enough real text on the page for search engines to understand it.
export interface LandingPage {
  slug: string;
  title: string; // <title>
  description: string; // meta description
  h1: string;
  intro: string;
  categories: PlaceCategory[];
  region?: string; // restrict places to this region
  bounds: Bounds;
  firesDefault: boolean;
  firesFirst: boolean; // list fires above places; false when the page's subject is something else
}

// Wide enough to include the approach drives (Beartooth, Chief Joseph, Buffalo Bill).
const YELLOWSTONE: Bounds = [
  [-111.2, 44.0],
  [-109.2, 45.1],
];
const GRAND_TETON: Bounds = [
  [-111.0, 43.5],
  [-110.3, 44.1],
];

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "yellowstone",
    title: "Yellowstone map: entrances, photo spots, and what's burning",
    description:
      "A visitor's map of Yellowstone National Park: the three Wyoming entrances, the geysers and valleys worth stopping for, the scenic drives in, and active wildfires right now.",
    h1: "Yellowstone",
    intro:
      "Three entrances on the Wyoming side, the geysers and valleys worth the stop, the drives in, and any fire burning nearby. Interior roads close to cars from early November to late April.",
    categories: CATEGORY_ORDER,
    region: "Yellowstone",
    bounds: YELLOWSTONE,
    firesDefault: true,
    firesFirst: false,
  },
  {
    slug: "grand-teton",
    title: "Grand Teton map: photo spots, Jenny Lake, and the drive in",
    description:
      "A visitor's map of Grand Teton National Park: Schwabacher Landing, Mormon Row, Oxbow Bend, Jenny Lake, Togwotee Pass, and active wildfires nearby.",
    h1: "Grand Teton",
    intro:
      "The sunrise spots everyone photographs, the lake at the foot of the peaks, and the pass that gives you the first view of the range. Nearly everything here is within twenty minutes of Moose.",
    categories: CATEGORY_ORDER,
    region: "Grand Teton",
    bounds: GRAND_TETON,
    firesDefault: true,
    firesFirst: false,
  },
  {
    slug: "scenic-drives",
    title: "Wyoming scenic drives map: Beartooth, Chief Joseph, Snowy Range, and more",
    description:
      "The eight Wyoming drives worth the detour, on one map, with the pass elevations, when each road closes for winter, and live wildfire activity along the way.",
    h1: "Scenic drives",
    intro:
      "Eight drives worth planning a day around, from the Beartooth switchbacks above 10,000 feet to the canyon road through Wind River. Each one says when it closes for snow.",
    categories: ["scenic-drive"],
    bounds: WYOMING_BOUNDS,
    firesDefault: true,
    firesFirst: false,
  },
  {
    slug: "photo-spots",
    title: "Wyoming photo spots map: where to stand in Yellowstone and Grand Teton",
    description:
      "Twelve places to stand for the photo, from Grand Prismatic's overlook to the Moulton Barn at sunrise, with the best time of day for each and live wildfire smoke to watch for.",
    h1: "Photo spots",
    intro:
      "Where to stand, and when. Sunrise for the Teton reflections, midday for Grand Prismatic's color, dusk in Lamar Valley for wolves. Twelve spots, all reachable by car and a short walk.",
    categories: ["photo-spot"],
    bounds: WYOMING_BOUNDS,
    firesDefault: true,
    firesFirst: false,
  },
  {
    slug: "wildfires",
    title: "Wyoming wildfire map: active fires and perimeters right now",
    description:
      "Every active wildfire in and around Wyoming on one map, with acres, containment, and mapped perimeters from NIFC, refreshed every ten minutes, next to the park entrances they affect.",
    h1: "Wildfires right now",
    intro:
      "Active fires in and just over the Wyoming line, with size, containment, and the mapped perimeter when one has been published. Data from NIFC, refreshed every ten minutes. Park entrances shown for context.",
    categories: ["park"],
    bounds: WYOMING_BOUNDS,
    firesDefault: true,
    firesFirst: true,
  },
];

export const getLandingPage = (slug: string) => LANDING_PAGES.find((p) => p.slug === slug);

export const scopePlaces = (places: Place[], page: LandingPage) =>
  places.filter((p) => !page.region || p.region === page.region);
