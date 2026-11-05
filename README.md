# Wyoming Map

Wyoming elk and deer draw odds by hunt area, at your own preference points. Live at
[wyomingmap.com](https://wyomingmap.com).

Every hunt area has a page with its map, the points nonresidents needed, your own odds in
the draw, season dates, what each license allows and how hunters did there. The hunt
finder ranks every license by your chance of drawing it and filling it. A hunter's points
are kept in their browser, so there are no accounts.

The earlier products in this repo, an energy and data-center tracker and a visitor map,
were removed. Their history is in git.

## Stack

- Next.js 14 (App Router), React 18, TypeScript; every page is prerendered at build time
- MapLibre GL with OpenFreeMap tiles and AWS Terrain Tiles (no API key)
- GSAP for the hero and the animated draw
- Vercel for hosting and Web Analytics
- Python scripts that turn Wyoming Game and Fish (WGFD) PDFs into the JSON in `data/`

## Develop

```bash
npm install
npm run dev
```

Check a change with `npm run build`. There is no test suite.

## Pages

All pages live in the `app/(hunt)/` route group and share its layout, masthead and footer.

| route | what it is | data |
|---|---|---|
| `/` | The statewide map and the draw, for your points | both species |
| `/hunting/elk`, `/hunting/elk/area-N` | Elk index and area pages | `data/elk-hunt-areas.json` |
| `/hunting/deer`, `/hunting/deer/area-N`, `/hunting/deer/region-x` | Deer index, area and nonresident region pages | `data/deer-hunt-areas.json` |
| `/hunting/elk/finder`, `/hunting/deer/finder` | Hunt finder: every license by draw chance times success | hunt and harvest data |
| `/about`, `/contact`, `/privacy`, `/terms` | Trust pages, styled by `app/(hunt)/info.css` | none |
| `/sitemap.xml`, `/robots.txt` | Generated in `app/sitemap.ts` and `app/robots.ts` | area lists |

Add new static pages to `app/sitemap.ts` and, if they matter to readers, to the footer in
`app/(hunt)/layout.tsx`.

## Data

### Hunt areas

`data/<species>-hunt-areas.json` holds each area's draw results, season dates, what each
license allows and boundary description. They come from WGFD's published draw reports,
its season regulation (Chapter 6 for deer, Chapter 7 for elk) and its ArcGIS hunt-area
layers. `public/data/<species>-hunt-areas.geojson` holds the boundaries alone, for the
statewide map.

The 17 deer nonresident general-license regions get their own pages, since nonresidents
draw deer by region rather than by area. Elk areas with a general season show their
region's general license (Eastern, Southern or Western) on the area page.

```bash
python3 -I scripts/hunts/build_hunt_data.py elk /tmp/wgfd
python3 -I scripts/hunts/build_hunt_data.py deer /tmp/wgfd
```

Needs `pdftotext` (poppler). WGFD posts new reports every year (nonresident in May,
resident in June) and a new season regulation, each under new media ids. Update `YEAR`
and the ids in `SPECIES` in the script, rerun, check that the printed hunt counts match
the reports, and read any warnings (a season row the parser could not place, an area with
no boundary description).

### Hunter success

`data/<species>-harvest.json` holds hunter success and days per animal for every hunt
area, license type and nonresident general region, from WGFD's annual harvest reports
(the deer report keeps mule deer and white-tailed deer apart). Area pages show it beside
the draw, and the hunt finder uses it for its ranking.

```bash
python3 -I scripts/hunts/build_harvest_data.py elk /tmp/wgfd
python3 -I scripts/hunts/build_harvest_data.py deer /tmp/wgfd
```

The reports come out in February for the season just hunted. Update `SEASON` and the media
ids in the script.

### Outfitter listings

`data/outfitter-listings.json` lists the outfitters shown on area and deer region pages,
entered by hand from their replies. Each entry has the outfitter's license number (check it
against the State Board of Outfitters' directory), business, name, town, a one-line blurb,
a link, an optional photo under `public/outfitters/`, the `elk` and `deer` areas it is
licensed in, and `until`, the date the listing runs to. Pages are built at deploy time, so
an expired listing drops off at the next deploy. The shape is `OutfitterListing` in
`lib/outfitters.ts`.

Photos are not in yet. When they are, they need to be sourced and licensed, not scraped.

## Share cards and icons

Every area and region page has a share card (`opengraph-image.tsx` beside the page, drawn
by `lib/og.tsx`), built at deploy time from the same data. The fonts in `lib/og/` are
static Fraunces and Geist instances (OFL) from Fontsource, because the image renderer
can't read variable fonts or woff2.

`app/icon.svg` is the favicon. `app/favicon.ico` and `app/apple-icon.png` are rendered from
the same drawing for older browsers and iOS home screens.

## Before these pages are final

- `CONTACT_EMAIL` in `lib/site.ts` is marked as a placeholder. Confirm that the inbox
  works: the contact, privacy and terms pages all show it.
- `/privacy` and `/terms` are drafts and say so on the page. Each has a `TODO(owner)`
  comment listing what it still needs. After review, delete the `.in-draft` note and update
  the date.
- If you change what the site collects, change `/privacy` to match.
