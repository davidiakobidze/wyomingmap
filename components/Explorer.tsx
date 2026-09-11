"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Feature, Point } from "geojson";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  Place,
  PlaceCategory,
} from "@/lib/places";
import type { FireProps, FiresFeed } from "@/lib/live";
import type { MapOverlay, MapPoint } from "./WyomingMap";

// MapLibre touches `window` at import time, so keep it out of the server bundle.
const WyomingMap = dynamic(() => import("./WyomingMap"), { ssr: false });

const FIRE_COLOR = "#d9534f";
const FIRE_REFRESH_MS = 10 * 60 * 1000;
const fireId = (f: Feature<Point, FireProps>) => `fire:${f.properties.id}`;

const acresFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
// Dates are shown in Wyoming's timezone no matter where the visitor is.
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Denver",
});

function timeAgo(iso: string | null, now: number) {
  if (!iso) return null;
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

function acresLabel(acres: number) {
  if (acres < 1) return "under 1 acre";
  const rounded = Math.round(acres);
  return rounded === 1 ? "1 acre" : `${acresFmt.format(rounded)} acres`;
}

function fireSubtitle(p: FireProps) {
  const parts: string[] = [];
  if (p.acres != null) parts.push(acresLabel(p.acres));
  if (p.contained != null) parts.push(`${p.contained}% contained`);
  return parts.join(" · ") || "Size not yet reported";
}

export default function Explorer({ places }: { places: Place[] }) {
  const [categories, setCategories] = useState<Set<PlaceCategory>>(new Set(CATEGORY_ORDER));
  const [active, setActive] = useState<string | null>(null);
  const [fires, setFires] = useState<FiresFeed | null>(null);
  const [firesOn, setFiresOn] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Always ask the server; caching lives at the CDN and in the route's
        // upstream fetch, not in the visitor's browser.
        const res = await fetch("/api/live/fires", { cache: "no-store" });
        const feed = (await res.json()) as FiresFeed;
        if (!cancelled) setFires(feed);
      } catch (err) {
        if (!cancelled) {
          setFires({ ok: false, fetchedAt: new Date().toISOString(), error: String(err) });
        }
      }
      if (!cancelled) setNow(Date.now());
    };
    load();
    const timer = setInterval(load, FIRE_REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, []);

  const visible = useMemo(
    () => places.filter((p) => categories.has(p.category)),
    [places, categories]
  );
  const fireFeatures = useMemo(
    () => (firesOn && fires?.ok ? fires.incidents.features : []),
    [fires, firesOn]
  );

  const currentPlace = visible.find((p) => p.slug === active) ?? null;
  const currentFire = fireFeatures.find((f) => fireId(f) === active) ?? null;

  const points = useMemo<MapPoint[]>(
    () => [
      ...visible.map((p) => ({
        id: p.slug,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        color: CATEGORY_COLORS[p.category],
      })),
      ...fireFeatures.map((f) => ({
        id: fireId(f),
        name: `${f.properties.name} fire`,
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        color: FIRE_COLOR,
        className: "fire",
      })),
    ],
    [visible, fireFeatures]
  );

  const overlays = useMemo<MapOverlay[]>(() => {
    if (!firesOn || !fires?.ok || fires.perimeters.features.length === 0) return [];
    return [
      {
        id: "fire-perimeters",
        data: fires.perimeters,
        fill: { "fill-color": FIRE_COLOR, "fill-opacity": 0.22 },
        line: { "line-color": FIRE_COLOR, "line-width": 1.5 },
      },
    ];
  }, [fires, firesOn]);

  const toggleCategory = (c: PlaceCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  const onSelect = useCallback((id: string) => setActive(id), []);

  const fireStatus = (() => {
    if (!fires) return "checking…";
    if (!fires.ok) return "unavailable right now";
    const ago = timeAgo(fires.fetchedAt, now);
    return ago ? `updated ${ago}` : "updated";
  })();

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">Wyoming Map</a>
        <span className="tagline">One view to understand Wyoming.</span>
        <span className="count">{visible.length} of {places.length} places</span>
      </header>

      <aside className="sidebar">
        <div className="filters">
          <span className="label">Right now</span>
          <div className="chips">
            <button
              className={"chip" + (firesOn ? " on" : "") + (fires && !fires.ok ? " off" : "")}
              onClick={() => setFiresOn((v) => !v)}
              aria-pressed={firesOn}
              disabled={!!fires && !fires.ok}
            >
              <span className="dot" style={{ background: FIRE_COLOR }} />
              Wildfires{fires?.ok ? ` (${fires.incidents.features.length})` : ""}
            </button>
            <span className="status" aria-live="polite">{fireStatus}</span>
            <a
              className="chip link"
              href="https://wyoroad.info/"
              target="_blank"
              rel="noopener noreferrer"
              title="Live road conditions and closures from WYDOT 511"
            >
              Road conditions ↗
            </a>
          </div>

          <span className="label">Places</span>
          <div className="chips">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                className={"chip" + (categories.has(c) ? " on" : "")}
                onClick={() => toggleCategory(c)}
                aria-pressed={categories.has(c)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <ul className="list">
          {fireFeatures.map((f) => {
            const id = fireId(f);
            return (
              <li key={id}>
                <button
                  className={"row" + (id === active ? " active" : "")}
                  onClick={() => setActive(id)}
                >
                  <span className="dot" style={{ background: FIRE_COLOR }} />
                  <span>
                    <div className="name">{f.properties.name} fire</div>
                    <div className="sub">{fireSubtitle(f.properties)}</div>
                  </span>
                </button>
              </li>
            );
          })}
          {visible.map((p) => (
            <li key={p.slug}>
              <button
                className={"row" + (p.slug === active ? " active" : "")}
                onClick={() => setActive(p.slug)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                <span>
                  <div className="name">{p.name}</div>
                  <div className="sub">{p.region}</div>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {currentPlace && (
          <div className="detail">
            <button className="close" onClick={() => setActive(null)} aria-label="Close">
              ×
            </button>
            <div className="kicker">
              <span className="dot" style={{ background: CATEGORY_COLORS[currentPlace.category] }} />
              {CATEGORY_LABELS[currentPlace.category]} · {currentPlace.region}
            </div>
            <h2>{currentPlace.name}</h2>
            <p>{currentPlace.summary}</p>
            {currentPlace.season && <p className="season">{currentPlace.season}</p>}
            {currentPlace.link && (
              <p className="src">
                <a href={currentPlace.link} target="_blank" rel="noopener noreferrer">
                  More about this place ↗
                </a>
              </p>
            )}
            <p className="approx">Marker shows the approximate location.</p>
          </div>
        )}

        {currentFire && (
          <div className="detail">
            <button className="close" onClick={() => setActive(null)} aria-label="Close">
              ×
            </button>
            <div className="kicker">
              <span className="dot" style={{ background: FIRE_COLOR }} />
              Active wildfire · NIFC
            </div>
            <h2>{currentFire.properties.name} fire</h2>
            <dl className="kv">
              <dt>Size</dt>
              <dd>
                {currentFire.properties.acres != null
                  ? acresLabel(currentFire.properties.acres)
                  : "Not yet reported"}
              </dd>
              <dt>Contained</dt>
              <dd>
                {currentFire.properties.contained != null
                  ? `${currentFire.properties.contained}%`
                  : "Not yet reported"}
              </dd>
              <dt>Discovered</dt>
              <dd>
                {currentFire.properties.discovered
                  ? dateFmt.format(new Date(currentFire.properties.discovered))
                  : "Unknown"}
              </dd>
              <dt>Updated</dt>
              <dd>{timeAgo(currentFire.properties.updated, now) ?? "Unknown"}</dd>
            </dl>
            <p className="season">
              Check road and trail closures with the park or forest before you go. The shaded
              area is the mapped perimeter, when one has been published.
            </p>
            <p className="src">
              <a href="https://inciweb.wildfire.gov/" target="_blank" rel="noopener noreferrer">
                Incident details on InciWeb ↗
              </a>
            </p>
          </div>
        )}
      </aside>

      <div className="mapwrap">
        <WyomingMap points={points} overlays={overlays} activeId={active} onSelect={onSelect} />
      </div>
    </div>
  );
}
