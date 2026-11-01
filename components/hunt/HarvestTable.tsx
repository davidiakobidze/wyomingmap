import { AreaHarvest, FEW_HUNTERS, HARVEST_SEASON, HarvestStats, successSentence } from "@/lib/harvest";

const num = new Intl.NumberFormat("en-US");

export function HarvestRow({ label, s, sum }: { label: string; s: HarvestStats; sum?: boolean }) {
  const few = s.hunters > 0 && s.hunters < FEW_HUNTERS;
  return (
    <tr className={sum ? "sum" : undefined}>
      <td>{label}</td>
      <td>{num.format(s.hunters)}</td>
      <td>{num.format(s.harvest)}</td>
      <td>
        {s.hunters === 0 ? "—" : `${Math.round(s.success)}%`}
        {few && <span title={`Fewer than ${FEW_HUNTERS} hunters`}>*</span>}
      </td>
      <td>{s.daysPerHarvest === null ? "—" : s.daysPerHarvest.toFixed(1)}</td>
    </tr>
  );
}

// One harvest-report table for an area: each license type, then hunters by
// residency. `describe` names a type the way the area's sheet does.
export function HarvestTable({
  h,
  caption,
  describe,
}: {
  h: AreaHarvest;
  caption?: string;
  describe: (type: string) => string;
}) {
  const types = Object.entries(h.types).sort(([a], [b]) => (a === "GEN" ? -1 : b === "GEN" ? 1 : Number(a) - Number(b)));
  const few = [...Object.values(h.types), h.total, h.resident, h.nonresident].some(
    (s) => s && s.hunters > 0 && s.hunters < FEW_HUNTERS
  );
  return (
    <div className="hs-harvest">
      {caption && <h3>{caption}</h3>}
      <div className="table-scroll">
        <table className="odds harvest">
          <thead>
            <tr>
              <th>License</th>
              <th>Hunters</th>
              <th>Harvest</th>
              <th>Success</th>
              <th>Days per animal</th>
            </tr>
          </thead>
          <tbody>
            {types.map(([t, s]) => (
              <HarvestRow key={t} label={describe(t)} s={s} />
            ))}
            {h.resident && <HarvestRow label="Residents" s={h.resident} sum />}
            {h.nonresident && <HarvestRow label="Nonresidents" s={h.nonresident} sum />}
            <HarvestRow label="All hunters" s={h.total} sum />
          </tbody>
        </table>
      </div>
      {few && <p className="fine">* Fewer than {FEW_HUNTERS} hunters; the rate rests on a handful of reports.</p>}
    </div>
  );
}

// Nonresident general-license hunters in one region, a row per kind of game.
export function RegionHarvestTable({ rows }: { rows: { label: string; s: HarvestStats }[] }) {
  return (
    <div className="table-scroll">
      <table className="odds harvest">
        <thead>
          <tr>
            <th>Nonresident general license</th>
            <th>Hunters</th>
            <th>Harvest</th>
            <th>Success</th>
            <th>Days per animal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <HarvestRow key={r.label} label={r.label} s={r.s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The lead for an area's harvest section, nonresidents and residents compared.
export function harvestLead(h: AreaHarvest, animal: string): string {
  const parts = [successSentence(h.total, animal)];
  const { resident: r, nonresident: n } = h;
  if (r && n && r.hunters > 0 && n.hunters > 0) {
    parts.push(`Nonresidents: ${Math.round(n.success)}%; residents: ${Math.round(r.success)}%.`);
  }
  return parts.join(" ");
}

export function HarvestNote({ source, reports }: { source: string; reports: string }) {
  return (
    <p className="fine">
      From the Wyoming Game and Fish <a href={source}>{HARVEST_SEASON} harvest report</a>, estimated from its voluntary
      survey of license holders. Hunters counts active licenses for each type and active hunters on the summary rows;
      success is the share of them who took an animal. Days per animal is hunter days over harvest. One season&apos;s
      result, not a forecast; WGFD publishes <a href={reports}>every year&apos;s reports</a>.
    </p>
  );
}
