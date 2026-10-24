import { DemandDraw, PointsDraw, RegionDraws, chanceLabel, firstChoiceChance, pointsLabel, pointsSentence } from "@/lib/hunts";

// Draw results as list items, shared by every species' hunt-area pages.

const num = new Intl.NumberFormat("en-US");
const licenses = (n: number) => `${num.format(n)} license${n === 1 ? "" : "s"}`;

function PointsTable({ d }: { d: PointsDraw }) {
  const rows = d.rows.filter((r) => r.applicants > 0);
  if (rows.length === 0) return null;
  return (
    <table className="odds">
      <thead>
        <tr>
          <th>Points</th>
          <th>First-choice applicants</th>
          <th>Odds</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.odds >= 100 ? "sure" : r.odds > 0 ? "partial" : "none"}>
            <td>{pointsLabel(r.points)}</td>
            <td>{num.format(r.applicants)}</td>
            <td>{r.odds % 1 === 0 ? r.odds.toFixed(0) : r.odds.toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Demand({ label, d }: { label: string; d: DemandDraw }) {
  return (
    <li>
      <strong>{label}:</strong> {licenses(d.quota)}, {num.format(d.first)} first-choice applicants
      {d.first > 0 && <> ({chanceLabel(firstChoiceChance(d))})</>}.
    </li>
  );
}

export function Points({ label, d }: { label: string; d: PointsDraw }) {
  return (
    <>
      <li>
        <strong>{label}:</strong> {licenses(d.quota)}. {pointsSentence(d)}
      </li>
      {d.summary.applicants > 0 && !d.summary.allDrew && (
        <li className="table-item">
          <details>
            <summary>Point-by-point results</summary>
            <PointsTable d={d} />
          </details>
        </li>
      )}
    </>
  );
}

// The four nonresident draws every area-level and region-level license has.
export function NonresidentDraws({ d }: { d: RegionDraws }) {
  return (
    <>
      {d.nrPoints && <Points label="Nonresident, preference-point draw" d={d.nrPoints} />}
      {d.nrRandom && <Demand label="Nonresident, random draw" d={d.nrRandom} />}
      {d.nrSpecialPoints && <Points label="Nonresident special, preference-point draw" d={d.nrSpecialPoints} />}
      {d.nrSpecialRandom && <Demand label="Nonresident special, random draw" d={d.nrSpecialRandom} />}
    </>
  );
}
