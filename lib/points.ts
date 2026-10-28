"use client";

import { useSyncExternalStore } from "react";

// The hunter's own preference points, one count per species (Wyoming keeps
// elk and deer points separately). Kept in this browser only, so the odds on
// every hunt page can answer for them without an account.

export type Species = "elk" | "deer";
export const MAX_POINTS = 30;

const key = (s: Species) => `wyomingmap.points.${s}`;
const cache: Partial<Record<Species, number>> = {};
const listeners = new Set<() => void>();

function read(s: Species): number {
  try {
    const v = Number(window.localStorage.getItem(key(s)));
    return Number.isInteger(v) && v >= 0 ? Math.min(v, MAX_POINTS) : 0;
  } catch {
    return 0; // storage blocked: start from zero every visit
  }
}

export function setPoints(s: Species, n: number) {
  const v = Math.max(0, Math.min(MAX_POINTS, Math.round(n)));
  cache[s] = v;
  try {
    window.localStorage.setItem(key(s), String(v));
  } catch {
    // Not persisted; the count still holds for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  // Another tab changed the count.
  const onStorage = (e: StorageEvent) => {
    if (!e.key?.startsWith("wyomingmap.points.")) return;
    (Object.keys(cache) as Species[]).forEach((s) => delete cache[s]);
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

// The server renders every page at 0 points; the browser's own count replaces it after hydration.
export function usePoints(s: Species): number {
  return useSyncExternalStore(
    subscribe,
    () => (cache[s] ??= read(s)),
    () => 0
  );
}

export const speciesOf = (path: string | null): Species => (path?.startsWith("/hunting/deer") ? "deer" : "elk");
