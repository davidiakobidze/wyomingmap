import {
  DemandDraw,
  PointsDraw,
  RegionDraws,
  chanceLabel,
  chanceShort,
  combinedOdds,
  combinedSentence,
  firstChoiceChance,
  pointsLabel,
} from "@/lib/hunts";

// Draw results as list items, shared by every species' hunt-area pages.

const num = new Intl.NumberFormat("en-US");
const licenses = (n: number) => `${num.format(n)} license${n === 1 ? "" : "s"}`;

export function Demand({ label, d }: { label: string; d: DemandDraw }) {
  return (
    <li>
      <strong>{label}:</strong> {licenses(d.quota)}, {num.format(d.first)} first-choice applicants
      {d.first > 0 && <> ({chanceLabel(firstChoiceChance(d))})</>}.
    </li>
  );
}

// A nonresident preference-point draw and the random draw its losers go into,
// told as one story, with the combined chance at every point level.
function Combined({ label, p, r }: { label: string; p: PointsDraw; r?: DemandDraw }) {
  const o = combinedOdds(p, r);
  // At the cut level WGFD prints licenses left / applicants, which can differ
  // from what was issued; show both rather than silently pick one.
  const differs = (x: (typeof o.rows)[number]) => Math.abs((x.drew / x.applicants) * 100 - x.printed) > 0.05;
  const footnotes = o.rows.filter(differs);
  return (
    <>
      <li>
        <strong>{label}:</strong> {licenses(p.quota)} in the point draw
        {r && <>, {licenses(r.quota)} in the random draw</>}. {combinedSentence(o)}
      </li>
      {o.losers > 0 && o.rows.length > 1 && (
        <li className="table-item">
          <details>
            <summary>Chance at each point level</summary>
            <table className="odds">
              <thead>
                <tr>
                  <th>Points</th>
                  <th>Applicants</th>
                  <th>Drew in point draw</th>
                  <th>Chance, both draws</th>
                </tr>
              </thead>
              <tbody>
                {o.rows.map((x, i) => (
                  <tr key={i} className={x.drew === x.applicants ? "sure" : x.drew > 0 ? "partial" : "none"}>
                    <td>{pointsLabel(x.points)}</td>
                    <td>{num.format(x.applicants)}</td>
                    <td>
                      {num.format(x.drew)}
                      {differs(x) && "*"}
                    </td>
                    <td>{chanceShort(x.combined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {footnotes.map((x, i) => (
              <p className="fine" key={i}>
                * At {pointsLabel(x.points)} points WGFD&apos;s report prints {x.printed}% odds: the{" "}
                {Math.round((x.printed * x.applicants) / 100)} licenses left at that level divided by{" "}
                {num.format(x.applicants)} applicants. It issued {num.format(x.drew)}.
              </p>
            ))}
          </details>
        </li>
      )}
    </>
  );
}

// The nonresident draws every area-level and region-level license has.
export function NonresidentDraws({ d }: { d: RegionDraws }) {
  return (
    <>
      {d.nrPoints ? (
        <Combined label="Nonresident" p={d.nrPoints} r={d.nrRandom} />
      ) : (
        d.nrRandom && <Demand label="Nonresident, random draw" d={d.nrRandom} />
      )}
      {d.nrSpecialPoints ? (
        <Combined label="Nonresident special" p={d.nrSpecialPoints} r={d.nrSpecialRandom} />
      ) : (
        d.nrSpecialRandom && <Demand label="Nonresident special, random draw" d={d.nrSpecialRandom} />
      )}
    </>
  );
}

export function OddsAssumptions({ year }: { year: number }) {
  return (
    <details className="assumptions">
      <summary>What these odds assume</summary>
      <ul>
        <li>
          A nonresident&apos;s chance combines both draws: what happened in the {year} preference-point draw at
          their point level, plus, if they missed, their chance in the random draw. Wyoming gives 75% of
          nonresident licenses to the point draw and 25% to a random draw among everyone who missed it. In
          every {year} nonresident elk and deer draw, the random draw&apos;s first-choice applicants were exactly
          the point draw&apos;s unsuccessful applicants.
        </li>
        <li>
          The random-draw chance is random-draw licenses divided by those applicants. It leaves out second and
          third choices, which only matter when licenses are left over.
        </li>
        <li>
          The point-draw figure is licenses issued divided by applicants. Where the draw ran out, WGFD&apos;s
          printed odds are the licenses left divided by applicants, and in some draws WGFD issued a few more than
          were left, probably because a party applying together is drawn as one. Where the two differ, the table
          shows both.
        </li>
        <li>
          A party&apos;s points are averaged, which is where the &ldquo;just under&rdquo; rows come from. Each
          member is counted here as one applicant.
        </li>
        <li>
          With only a few licenses, one applicant moves the odds a lot, and the random draw may have none.
        </li>
        <li>
          These are {year} results, not a forecast. Quotas, applicant numbers and the points needed change every
          year.
        </li>
      </ul>
    </details>
  );
}
