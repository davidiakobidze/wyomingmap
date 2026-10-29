"use client";

import { track as send } from "@vercel/analytics";

// The handful of things readers do that show the site is used, not just
// visited. Vercel keeps at most two properties per event on Pro, so each
// event carries two at most. Analytics must never break the page.

type Events = {
  points_set: { species: string; points: number };
  draw_run: { where: string; license: string };
  returning: { species: string; points: number };
  finder_search: { query: string; picked: string };
  email_signup: { where: string };
  outfitter_click: { where: string };
};

export function track<K extends keyof Events>(name: K, data: Events[K]) {
  try {
    send(name, data);
  } catch {
    // Blocked or not loaded: the reader's action still goes through.
  }
}

// The points box sends a change per keystroke and per click; only the
// count a reader settles on is worth recording.
const settle: Record<string, ReturnType<typeof setTimeout>> = {};
export function trackSettled<K extends keyof Events>(name: K, key: string, data: Events[K], ms = 1500) {
  clearTimeout(settle[key]);
  settle[key] = setTimeout(() => track(name, data), ms);
}
