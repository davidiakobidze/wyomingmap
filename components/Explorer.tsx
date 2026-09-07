"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Project,
  ProjectStatus,
  ProjectType,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_COLORS,
  TYPE_LABELS,
} from "@/lib/projects";

const ProjectMap = dynamic(() => import("./ProjectMap"), { ssr: false });

const ALL_TYPES = Object.keys(TYPE_LABELS) as ProjectType[];

export default function Explorer({ projects }: { projects: Project[] }) {
  const [types, setTypes] = useState<Set<ProjectType>>(new Set(ALL_TYPES));
  const [statuses, setStatuses] = useState<Set<ProjectStatus>>(new Set(STATUS_ORDER));
  const [active, setActive] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      projects
        .filter((p) => types.has(p.type) && statuses.has(p.status))
        .sort((a, b) => b.updated.localeCompare(a.updated)),
    [projects, types, statuses]
  );
  const current = visible.find((p) => p.slug === active) ?? null;

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };
  const onSelect = useCallback((slug: string) => setActive(slug), []);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">Wyoming Map</a>
        <span className="tagline">Everything under construction in Wyoming, on one map.</span>
        <span className="count">{visible.length} of {projects.length} projects</span>
      </header>

      <aside className="sidebar">
        <div className="filters">
          <span className="label">Sector</span>
          <div className="chips">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                className={"chip" + (types.has(t) ? " on" : "")}
                onClick={() => toggle(types, t, setTypes)}
                aria-pressed={types.has(t)}
              >
                <span className="dot" style={{ background: TYPE_COLORS[t] }} />
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <span className="label">Status</span>
          <div className="chips">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={"chip" + (statuses.has(s) ? " on" : "")}
                onClick={() => toggle(statuses, s, setStatuses)}
                aria-pressed={statuses.has(s)}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <ul className="list">
          {visible.map((p) => (
            <li key={p.slug}>
              <button
                className={"row" + (p.slug === active ? " active" : "")}
                onClick={() => setActive(p.slug)}
              >
                <span className="dot" style={{ background: TYPE_COLORS[p.type] }} />
                <span>
                  <div className="name">{p.name}</div>
                  <div className="sub">
                    {p.developer} · {p.county} County
                  </div>
                </span>
                <span className="status">{STATUS_LABELS[p.status]}</span>
              </button>
            </li>
          ))}
        </ul>

        {current && (
          <div className="detail">
            <h2>{current.name}</h2>
            <dl className="kv">
              <dt>Sector</dt><dd>{TYPE_LABELS[current.type]}</dd>
              <dt>Status</dt><dd>{STATUS_LABELS[current.status]}</dd>
              <dt>Developer</dt><dd>{current.developer}</dd>
              <dt>County</dt><dd>{current.county}</dd>
              <dt>Scale</dt><dd>{current.capacity}</dd>
              <dt>Updated</dt><dd>{current.updated}</dd>
            </dl>
            <p>{current.summary}</p>
            <p className="src">
              {current.sources.map((s, i) => (
                <span key={s}>
                  {i > 0 && " · "}
                  <a href={s} target="_blank" rel="noopener noreferrer">Source {i + 1}</a>
                </span>
              ))}
            </p>
            <p className="approx">Marker shows approximate project location.</p>
          </div>
        )}
      </aside>

      <div className="mapwrap">
        <ProjectMap projects={visible} activeSlug={active} onSelect={onSelect} />
      </div>
    </div>
  );
}
