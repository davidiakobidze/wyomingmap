"use client";

import { useMemo, useState } from "react";
import type { FinderRow, HuntKind } from "@/lib/finder";
import { chanceShort } from "@/lib/hunts";
import { chanceOf } from "@/lib/license";
import { Species, usePoints } from "@/lib/points";
import { chanceColor } from "./sheetStyle";

type Who = "nonresident" | "resident";
type SortKey = "fill" | "chance" | "success" | "days";

const KINDS: Record<Species, { value: HuntKind | "all"; label: string }[]> = {
  elk: [
    { value: "all", label: "Any license" },
    { value: "antlered", label: "Bull or any elk" },
    { value: "antlerless", label: "Cow/calf" },
    { value: "general", label: "General" },
  ],
  deer: [
    { value: "all", label: "Any license" },
    { value: "antlered", label: "Buck or any deer" },
    { value: "antlerless", label: "Doe/fawn" },
    { value: "general", label: "General" },
  ],
};

const MIN_CHANCE = [
  { value: 0, label: "Any chance" },
  { value: 0.25, label: "25% or better" },
  { value: 0.5, label: "50% or better" },
  { value: 0.995, label: "Sure tags only" },
];

const PAGE = 40;

// Every license a hunter could put in for, ranked for their own points: the
// chance to draw it, how its hunters did last season, and the two together.
export default function HuntFinder({
  species,
  rows,
  season,
  year,
}: {
  species: Species;
  rows: FinderRow[];
  season: number; // harvest season
  year: number; // draw year
}) {
  const pts = usePoints(species);
  const [who, setWho] = useState<Who>("nonresident");
  // Most hunters are after a bull or a buck; cow/calf and doe/fawn tags would otherwise fill the top.
  const [kind, setKind] = useState<HuntKind | "all">("antlered");
  const [min, setMin] = useState(0);
  const [sort, setSort] = useState<SortKey>("fill");
  const [limit, setLimit] = useState(PAGE);

  const ranked = useMemo(() => {
    const val = (x: { c: number; s: number | null; fill: number | null; d: number | null }) => {
      switch (sort) {
        case "fill":
          return x.fill ?? -1;
        case "chance":
          return x.c;
        case "success":
          return x.s ?? -1;
        case "days":
          return x.d === null ? -Infinity : -x.d; // fewer days first
      }
    };
    return rows
      .map((r) => {
        const c = who === "nonresident" ? (r.nonresident ? chanceOf(r.nonresident, pts) : null) : r.resident;
        const s = r.harvest && r.harvest.hunters > 0 ? r.harvest.success / 100 : null;
        return { r, c, s, d: r.harvest?.daysPerHarvest ?? null, fill: c !== null && s !== null ? c * s : null };
      })
      .filter((x): x is typeof x & { c: number } => x.c !== null)
      .filter((x) => (kind === "all" || x.r.kind === kind) && x.c >= min)
      .sort((a, b) => val(b) - val(a) || b.c - a.c);
  }, [rows, who, kind, min, sort, pts]);

  const shown = ranked.slice(0, limit);
  const th = (key: SortKey, text: string, short: string) => (
    <th className="num" aria-sort={sort === key ? "descending" : undefined}>
      <button type="button" onClick={() => setSort(key)}>
        <span className="wide-only">{text}</span>
        <span className="narrow-only">{short}</span>
        {sort === key ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <>
      <div className="hs-controls" role="group" aria-label="Filter hunts">
        <div className="hs-seg" role="radiogroup" aria-label="Residency">
          {(["nonresident", "resident"] as Who[]).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={who === w}
              className={who === w ? "on" : ""}
              onClick={() => {
                setWho(w);
                setLimit(PAGE);
              }}
            >
              {w === "nonresident" ? "Nonresident" : "Resident"}
            </button>
          ))}
        </div>
        <label>
          <span>License</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as HuntKind | "all")}>
            {KINDS[species].map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Your chance</span>
          <select value={min} onChange={(e) => setMin(Number(e.target.value))}>
            {MIN_CHANCE.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hs-filter">
        {ranked.length} hunts ·{" "}
        {who === "nonresident"
          ? `chances for ${pts} ${species} point${pts === 1 ? "" : "s"}, set at the top of the page`
          : "resident random draw, first choice"}
      </p>

      <div className="table-scroll">
        <table className="index finder">
          <thead>
            <tr>
              <th>No.</th>
              <th>Hunt</th>
              {th("chance", `Draw (${year})`, "Draw")}
              {th("success", `Success (${season})`, "Success")}
              {th("fill", "Draw and fill", "Fill")}
              <th className="num hide-sm">
                <button type="button" onClick={() => setSort("days")}>
                  Days per animal{sort === "days" ? " ↑" : ""}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ r, c, s, fill }) => (
              <tr key={r.key}>
                <td className="area">{r.num}</td>
                <td className="name">
                  <a href={r.href}>{r.name}</a>
                  <div className="sub">
                    {r.license}
                    {r.season && <span className="hide-sm"> · {r.season}</span>}
                  </div>
                </td>
                <td className="num">
                  <span className="chip-c">
                    {chanceShort(c)}
                    <i style={{ background: chanceColor(c) }} />
                  </span>
                </td>
                <td className="num">
                  {s === null ? "—" : `${Math.round(s * 100)}%`}
                  {r.harvest?.of && <div className="sub">{r.harvest.of}</div>}
                </td>
                <td className="num fill">{fill === null ? "—" : `${Math.round(fill * 100)}%`}</td>
                <td className="num hide-sm">{r.harvest?.daysPerHarvest == null ? "—" : r.harvest.daysPerHarvest.toFixed(1)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="sub">
                  No hunt matches. Loosen the chance filter or pick another license.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {ranked.length > limit && (
        <button type="button" className="hs-btn" onClick={() => setLimit((n) => n + PAGE * 2)}>
          Show more hunts ({ranked.length - limit} left)
        </button>
      )}
    </>
  );
}
