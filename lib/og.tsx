import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Geometry, Position } from "geojson";
import { ImageResponse } from "next/og";
import { chanceBig, chanceText, combinedOdds, firstChoiceChance, pointsNeeded } from "@/lib/hunts";
import { License, demandOf } from "@/lib/license";
import { WYOMING_BOUNDS } from "@/lib/site";

// Share cards: the 1200x630 image a link to a hunt page unfurls into, in the
// First Light colours. Rendered at build time from the same data as the page.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  night: "#0a0f1c",
  night3: "#1a2440",
  snow: "#f4efe6",
  snow2: "rgba(244, 239, 230, 0.74)",
  mute: "#8f97ad",
  line: "rgba(244, 239, 230, 0.22)",
  gold: "#ffd27a",
  ember: "#f4a259",
};

// Static instances of the pages' fonts (the renderer can't read variable fonts or woff2).
const font = (file: string) => readFile(join(process.cwd(), "lib/og", file));

export interface Stat {
  big: string; // "9", "34%", "Closed"
  label: string; // what the number is
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n - 1))}…`);

// "Type 1 any elk", "Western region general license"
function licenseName(l: License): string {
  return l.id === "general" ? `${l.kicker} general license` : `${l.kicker} ${clip(l.title.toLowerCase(), 44)}`;
}

// The one number a license comes down to for a nonresident: the points that
// drew, or with a random-only draw, the first-choice odds.
export function licenseStat(l: License, year: number): Stat | null {
  if (l.points) {
    const o = combinedOdds(l.points, l.random);
    if (o.applicants === 0) return null;
    const need = pointsNeeded(l.points);
    if (need !== null && need >= 1) {
      const n = Math.ceil(need);
      const fewer = o.randomQuota > 0 && o.random !== null ? ` With fewer, ${chanceText(o.random)} in the random draw.` : "";
      return {
        big: String(n),
        label: `preference point${n === 1 ? "" : "s"} nonresidents needed for the ${licenseName(l)} in the ${year} draw.${fewer}`,
      };
    }
    return {
      big: chanceBig(o.floor?.combined ?? null),
      label: `a nonresident's chance with no points at the ${licenseName(l)} in the ${year} draw.`,
    };
  }
  const d = demandOf(l);
  const c = d && firstChoiceChance(d.d);
  if (!d || c === null) return null;
  return {
    big: c >= 100 ? "100%" : c < 1 ? "<1%" : `${Math.round(c)}%`,
    label: `${d.who.toLowerCase()} first-choice odds at the ${licenseName(l)} in the ${year} draw.`,
  };
}

// Rings of polygons, for drawing outlines.
function rings(g: Geometry): Position[][] {
  if (g.type === "Polygon") return g.coordinates;
  if (g.type === "MultiPolygon") return g.coordinates.flat();
  return [];
}

// SVG path data for some geometries, fitted into a w x h box with longitude
// shrunk by cos(latitude) so shapes keep their proportions.
function fit(geoms: Geometry[], w: number, h: number) {
  const all = geoms.flatMap(rings).flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const scale = Math.min(w / ((x1 - x0) * k), h / (y1 - y0));
  const ox = (w - (x1 - x0) * k * scale) / 2;
  const oy = (h - (y1 - y0) * scale) / 2;
  const pt = (p: Position) => `${(ox + (p[0] - x0) * k * scale).toFixed(1)},${(oy + (y1 - p[1]) * scale).toFixed(1)}`;
  return {
    paths: geoms.map((g) =>
      rings(g)
        .map((r) => `M${r.map(pt).join("L")}Z`)
        .join("")
    ),
    pt,
  };
}

// Where the shape sits in the state: Wyoming is a rectangle, so a box and a dot.
function Locator({ geoms }: { geoms: Geometry[] }) {
  const [[w0, s0], [e0, n0]] = WYOMING_BOUNDS;
  const W = 150;
  const H = Math.round((W * (n0 - s0)) / ((e0 - w0) * Math.cos((43 * Math.PI) / 180)));
  const pts = geoms.flatMap(rings).flat();
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const x = ((cx - w0) / (e0 - w0)) * W;
  const y = ((n0 - cy) / (n0 - s0)) * H;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke={C.line} strokeWidth={2} />
      <circle cx={x} cy={y} r={7} fill={C.gold} />
    </svg>
  );
}

export interface Card {
  kicker: string; // "Wyoming elk · Hunt area 7"
  name: string; // "Laramie Peak"
  stat: Stat | null;
  note?: string; // a season line
  geoms?: Geometry[]; // drawn on the right
  locate?: boolean; // show where the shape sits in Wyoming; off for whole-state cards
  year: number;
}

export async function shareCard(c: Card): Promise<ImageResponse> {
  const [serif, serifItalic, mono, sans] = await Promise.all([
    font("fraunces-latin-500-normal.woff"),
    font("fraunces-latin-400-italic.woff"),
    font("geist-mono-latin-500-normal.woff"),
    font("geist-sans-latin-400-normal.woff"),
  ]);
  const shape = c.geoms?.length ? fit(c.geoms, 400, 400) : null;
  const nameSize = c.name.length > 22 ? 64 : 80;
  // A word ("Closed") goes over its label; a number sits beside it.
  const word = (c.stat?.big.length ?? 0) > 4;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          color: C.snow,
          fontFamily: "Geist",
          backgroundColor: C.night,
          // The hour before sunrise: night overhead, a band of gold at the horizon.
          backgroundImage: `radial-gradient(ellipse at 50% 100%, rgba(244, 162, 89, 0.42), rgba(255, 210, 122, 0.08) 38%, rgba(10, 15, 28, 0) 62%), linear-gradient(180deg, ${C.night} 0%, ${C.night3} 100%)`,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 22, letterSpacing: 3, color: C.gold, textTransform: "uppercase" }}>
            {c.kicker}
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: nameSize, lineHeight: 1.05, marginTop: 14, letterSpacing: -1 }}>
            {c.name}
          </div>
          {c.stat && (
            <div style={{ display: "flex", flexDirection: word ? "column" : "row", alignItems: "flex-start", marginTop: 34, gap: word ? 12 : 26 }}>
              <div style={{ display: "flex", flexShrink: 0, fontFamily: "Fraunces", fontSize: word ? 120 : 150, lineHeight: 0.9, color: C.gold }}>
                {c.stat.big}
              </div>
              <div style={{ display: "flex", fontSize: 27, lineHeight: 1.35, color: C.snow2, maxWidth: 420, marginTop: word ? 0 : 6 }}>
                {c.stat.label}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flex: 1 }} />
          {c.note && (
            <div style={{ display: "flex", fontFamily: "Fraunces Italic", fontSize: 30, color: C.snow, marginBottom: 18 }}>{c.note}</div>
          )}
          <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 20, letterSpacing: 2, color: C.mute }}>
            WYOMINGMAP.COM · WGFD {c.year} DRAW RESULTS
          </div>
        </div>
        {shape && c.geoms && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", width: 400, marginLeft: 40 }}>
            <svg width={400} height={400} viewBox="0 0 400 400">
              {shape.paths.map((d, i) => (
                <path key={i} d={d} fill="rgba(255, 210, 122, 0.12)" stroke={C.gold} strokeWidth={3} strokeLinejoin="round" />
              ))}
            </svg>
            {c.locate !== false && <Locator geoms={c.geoms} />}
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: serif, weight: 500, style: "normal" },
        { name: "Fraunces Italic", data: serifItalic, weight: 400, style: "italic" },
        { name: "Geist Mono", data: mono, weight: 500, style: "normal" },
        { name: "Geist", data: sans, weight: 400, style: "normal" },
      ],
    }
  );
}
