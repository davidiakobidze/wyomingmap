import { Season, seasonDates } from "@/lib/hunts";

const num = new Intl.NumberFormat("en-US");

// Season rows from a WGFD regulation: dates, special archery, quota, and what's legal.
export default function SeasonTable({ seasons, game, showQuota }: { seasons: Season[]; game: string; showQuota?: boolean }) {
  return (
    <div className="table-scroll">
      <table className="seasons">
        <thead>
          <tr>
            <th>Season</th>
            <th>Special archery</th>
            {showQuota && <th>Quota</th>}
            <th>Legal {game}</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s, i) => (
            <tr key={i}>
              <td>{seasonDates(s)}</td>
              <td>{s.archery ? `${s.archery[0]} to ${s.archery[1]}` : "—"}</td>
              {showQuota && <td>{typeof s.quota === "number" ? num.format(s.quota) : s.quota ?? "—"}</td>}
              <td>{s.limitations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
