import { CONTACT_EMAIL } from "@/lib/site";
import { MapArea, labelPoint } from "@/lib/hunts";

// Server-rendered pieces of a hunt sheet: the collar along the top edge, the
// adjoining-areas key, and the outfitter listing.

export function Collar({ children, year }: { children: React.ReactNode; year: number }) {
  return (
    <div className="hs-collar">
      <span>{children}</span>
      <span className="stamp">Revised {year}</span>
    </div>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="hs-crumbs" aria-label="Breadcrumb">
      {items.map((x, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {x.href ? <a href={x.href}>{x.label}</a> : x.label}
        </span>
      ))}
    </nav>
  );
}

// Grid cells in reading order around the centre; index by compass octant
// starting east and turning counter-clockwise.
const OCTANT_CELL = [5, 2, 1, 0, 3, 6, 7, 8];

// The neighbours laid out the way a quad's margin names the adjoining sheets:
// each in the compass direction it lies, nearest first, at most eight.
export function Adjoining<T extends MapArea>({ a, near, href }: { a: T; near: T[]; href: (x: T) => string }) {
  const c = labelPoint(a);
  const k = Math.cos((c.lat * Math.PI) / 180);
  const placed = near
    .map((n) => {
      const p = labelPoint(n);
      const dx = (p.lng - c.lng) * k;
      const dy = p.lat - c.lat;
      return { n, angle: Math.atan2(dy, dx), d: Math.hypot(dx, dy) };
    })
    .sort((x, y) => x.d - y.d);
  const cells: (T | null)[] = Array(9).fill(null);
  const free = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
  placed.forEach(({ n, angle }) => {
    if (!free.size) return;
    const want = (angle / (Math.PI / 4) + 8) % 8;
    const best = [...free].sort((p, q) => {
      const dp = Math.min(Math.abs(p - want), 8 - Math.abs(p - want));
      const dq = Math.min(Math.abs(q - want), 8 - Math.abs(q - want));
      return dp - dq;
    })[0];
    free.delete(best);
    cells[OCTANT_CELL[best]] = n;
  });
  cells[4] = a;

  return (
    <div className="hs-adjoin-wrap">
      <div className="hs-adjoin">
        {cells.map((x, i) =>
          i === 4 ? (
            <span key={i} className="me" aria-current="page">
              {a.area}
            </span>
          ) : x ? (
            <a key={i} href={href(x)} title={`Area ${x.area}: ${x.name}`}>
              {x.area}
            </a>
          ) : (
            <span key={i} />
          )
        )}
      </div>
      <div className="cap">Adjoining areas</div>
    </div>
  );
}

// The areas around this one: the compass key, then the same areas by name.
export function Around<T extends MapArea>({
  a,
  near,
  href,
  species,
}: {
  a: T;
  near: T[];
  href: (x: T) => string;
  species: string;
}) {
  if (!near.length) return null;
  return (
    <section className="hs-sec" id="around">
      <div className="sh">
        <h2>Around Area {a.area}</h2>
        <p>The {species} areas next to this one, laid out the way they lie on the ground.</p>
      </div>
      <div className="hs-around">
        <Adjoining a={a} near={near} href={href} />
        <ul className="hs-nearby">
          {near.map((n) => (
            <li key={n.area}>
              <a href={href(n)}>
                <b>{n.area}</b> {n.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Outfitters({ where, subject }: { where: string; subject: string }) {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    "Outfitter name:\nWyoming outfitter license number:\nAreas you guide in:\nWebsite:\n"
  )}`;
  return (
    <aside className="hs-outfit">
      <div>
        <div className="kicker">Outfitters licensed in {where}</div>
        <p>
          Hunters reading this sheet are deciding where to apply. If you guide in {where}, list your outfit here
          with your name, a photo and a link to your site.
        </p>
      </div>
      <a className="hs-btn dark" href={mailto}>
        Get listed
      </a>
    </aside>
  );
}
