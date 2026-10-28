"use client";

import { useMemo, useState } from "react";
import { chanceShort } from "@/lib/hunts";
import { AreaOdds, chanceOf } from "@/lib/license";
import { Species, usePoints } from "@/lib/points";
import { chanceColor } from "./sheetStyle";

export interface IndexRow {
  key: string;
  num: string; // "7", "G"
  name: string;
  href: string;
  sub?: string; // herd, region
  license: string; // what the chance is for: "Type 1, any elk", "Region G general"
  need?: number; // whole points sure to draw on points; 0 when anyone could, absent when no level was
  odds: AreaOdds | null;
}

type SortKey = "num" | "name" | "need" | "chance";

// The sheet index: every area with the hunter's own chance, sortable and filterable.
export default function AreaIndex({ species, rows, label }: { species: Species; rows: IndexRow[]; label: string }) {
  const pts = usePoints(species);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "num", dir: 1 });

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const withChance = rows
      .filter((r) => !needle || `${r.num} ${r.name} ${r.sub ?? ""}`.toLowerCase().includes(needle))
      .map((r) => ({ r, c: r.odds ? chanceOf(r.odds, pts) : null }));
    const val = (x: (typeof withChance)[number]): number | string => {
      switch (sort.key) {
        case "num":
          return isNaN(Number(x.r.num)) ? x.r.num : Number(x.r.num);
        case "name":
          return x.r.name;
        case "need":
          return x.r.need ?? 999;
        case "chance":
          return x.c ?? -1;
      }
    };
    return withChance.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [rows, q, pts, sort]);

  // `short` stands in for the heading on a phone, where the full one would push "Your chance" off screen.
  const th = (key: SortKey, text: string, cls?: string, short?: string) => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button
        type="button"
        onClick={() =>
          setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "chance" ? -1 : 1 }))
        }
      >
        {short ? (
          <>
            <span className="wide-only">{text}</span>
            <span className="narrow-only">{short}</span>
          </>
        ) : (
          text
        )}
        {sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <>
      <div className="hs-filter">
        <input
          type="search"
          placeholder={`Find ${label} by number, name or herd`}
          aria-label={`Find ${label}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span>
          {shown.length} of {rows.length} · chances for {pts} {species} point{pts === 1 ? "" : "s"}
        </span>
      </div>
      <div className="table-scroll">
        <table className="index">
          <thead>
            <tr>
              {th("num", "No.")}
              {th("name", "Name")}
              <th className="hide-sm">Nonresident license</th>
              {th("need", "Points for a sure tag", "num", "Sure at")}
              {th("chance", "Your chance", "num", "You")}
            </tr>
          </thead>
          <tbody>
            {shown.map(({ r, c }) => (
              <tr key={r.key}>
                <td className="area">{r.num}</td>
                <td className="name">
                  <a href={r.href}>{r.name}</a>
                  {r.sub && <div className="sub">{r.sub}</div>}
                </td>
                <td className="hide-sm sub">{r.license}</td>
                <td className="num">{r.need === undefined ? "—" : r.need === 0 ? "Any" : r.need}</td>
                <td className="num">
                  {c === null ? (
                    "—"
                  ) : (
                    <span className="chip-c">
                      {chanceShort(c)}
                      <i style={{ background: chanceColor(c) }} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
