# Wyoming Map

A curated map of Wyoming for visitors. One screen: the national parks, the scenic drives
worth the detour, and the spots to stand for the photo. Live conditions (wildfire, road
closures) come next.

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

## Components

- `components/Explorer.tsx` — sidebar (category filters, list, detail panel) and the map.
- `components/WyomingMap.tsx` — MapLibre map bounded to Wyoming, product-neutral. Renders
  `MapPoint[]` as click-selectable markers and falls back to a message when WebGL is
  unavailable.

## Next

- Live layer: wildfire perimeters (NIFC) and road closures (WYDOT 511)
- Custom map style
- Themed landing pages for search
- Sponsor-interest page
- Analytics
