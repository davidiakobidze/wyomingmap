# Wyoming Map

A curated map of Wyoming for visitors. One screen: the national parks, the scenic drives
worth the detour, the spots to stand for the photo, and what is burning right now.

The previous product in this repo (an energy and data-center project tracker) was removed;
its history is at commit `46544a9` on `main`.

## Stack

- Next.js 14, React 18, TypeScript
- MapLibre GL with OpenFreeMap tiles (no API key)
- Curated places in `data/places.json`, typed in `lib/places.ts`

## Develop

```bash
npm install
npm run dev
```

## Data

Each place in `data/places.json` has:

| field | notes |
|---|---|
| `slug` | stable id, used for the marker and (later) URLs |
| `name` | display name |
| `category` | `park`, `scenic-drive`, or `photo-spot` |
| `region` | short grouping label shown under the name |
| `lat`, `lng` | approximate; scenic drives use a representative point (a pass or overlook) |
| `summary` | one to three sentences, factual, written for a visitor |
| `season` | optional; closures and timing that change a trip |
| `link` | optional; official NPS page or Wikipedia |

Photos are not in yet. When they are, they need to be sourced and licensed, not scraped.

## Live layers

Live feeds are fetched server-side, normalized to GeoJSON, and served from `app/api/live/*`.
The client never talks to an upstream API directly, so a feed can change or go down without
touching the map code. Every feed responds `{ ok: false, error }` (HTTP 200, uncached) when
upstream fails; the UI shows it as unavailable and everything else keeps working.

| route | source | refresh | notes |
|---|---|---|---|
| `/api/live/fires` | NIFC WFIGS (no key) | upstream cached 10 min, CDN 5 min | Active wildfire incidents (WF and CX; prescribed burns excluded) and published perimeters within a padded Wyoming envelope. Same service WYDOT's own 511 map uses. |

To test the failure path locally, point the upstream at a dead port:

```bash
NIFC_BASE_URL=http://127.0.0.1:9 npm run dev
```

**Road closures (WYDOT 511) are not wired.** WYDOT's public map obfuscates its data
endpoints at runtime, which is a clear signal the feed is not meant for third parties, and
it would break the moment they rotate it. The right path is WYDOT's official traveler-
information data program (request access through WYDOT). Until then the map links out to
wyoroad.info.

## Components

- `components/Explorer.tsx` — sidebar (live toggles, category filters, list, detail panels)
  and the map.
- `components/WyomingMap.tsx` — MapLibre map bounded to Wyoming, product-neutral. Renders
  `MapPoint[]` as click-selectable markers and `MapOverlay[]` as GeoJSON fill/line layers,
  and falls back to a message when WebGL is unavailable.

## Next

- Road closures once WYDOT data access is arranged
- Weather warnings (NWS watches/warnings feature service, public, no key)
- Custom map style
- Themed landing pages for search
- Sponsor-interest page
- Analytics
