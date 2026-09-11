export const SITE_NAME = "Wyoming Map";
export const SITE_URL = "https://wyomingmap.com";
export const TAGLINE = "One view to understand Wyoming.";

// TODO(owner): replace with the real inbox before this goes live. Deliberately
// not a personal address; sponsor mail should land somewhere shared.
export const CONTACT_EMAIL = "hello@wyomingmap.com";

export type Bounds = [[number, number], [number, number]];

export const WYOMING_BOUNDS: Bounds = [
  [-111.2, 40.9],
  [-104.0, 45.1],
];
