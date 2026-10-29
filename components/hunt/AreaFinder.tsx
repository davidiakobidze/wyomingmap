"use client";

import { useMemo, useState } from "react";
import { track } from "@/lib/track";

export interface FinderEntry {
  key: string;
  species: "Elk" | "Deer";
  num: string;
  name: string;
  href: string;
  sub?: string;
}

// One box over every elk and deer sheet: type an area number, a name or a
// herd, and go straight to its sheet.
export default function AreaFinder({ entries }: { entries: FinderEntry[] }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const exact = entries.filter((e) => e.num.toLowerCase() === needle);
    const rest = entries.filter(
      (e) => e.num.toLowerCase() !== needle && `${e.name} ${e.sub ?? ""}`.toLowerCase().includes(needle)
    );
    return [...exact, ...rest].slice(0, 8);
  }, [q, entries]);

  return (
    <form
      className="hs-find"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        track("finder_search", { query: q.trim().slice(0, 60), picked: hits[0]?.key ?? "none" });
        if (hits[0]) window.location.href = hits[0].href;
      }}
    >
      <label htmlFor="hs-find">Find a hunt area</label>
      <input
        id="hs-find"
        type="search"
        autoComplete="off"
        placeholder="Area number, name or herd: 7, Shirley Mountain, Platte Valley"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim() && (
        <ul aria-live="polite">
          {hits.length ? (
            hits.map((h) => (
              <li key={h.key}>
                <a href={h.href} onClick={() => track("finder_search", { query: q.trim().slice(0, 60), picked: h.key })}>
                  <b>
                    {h.species} {h.num}
                  </b>
                  <span>
                    {h.name}
                    {h.sub && <small>{h.sub}</small>}
                  </span>
                </a>
              </li>
            ))
          ) : (
            <li className="none">No elk or deer area matches &ldquo;{q.trim()}&rdquo;.</li>
          )}
        </ul>
      )}
    </form>
  );
}
