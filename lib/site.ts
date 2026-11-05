export const SITE_NAME = "Wyoming Map";
export const SITE_URL = "https://wyomingmap.com";
export const TAGLINE = "Wyoming elk and deer draw odds, by hunt area, at your own points.";

// TODO(owner): replace with the real inbox before this goes live. Deliberately
// not a personal address; sponsor mail should land somewhere shared.
export const CONTACT_EMAIL = "hello@wyomingmap.com";

// TODO(owner): placeholder price, untested with outfitters. Confirm before this goes live.
export const LISTING_PRICE = "$100 a month";

export type Bounds = [[number, number], [number, number]];

export const WYOMING_BOUNDS: Bounds = [
  [-111.2, 40.9],
  [-104.0, 45.1],
];
