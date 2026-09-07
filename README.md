# Wyoming Map

Everything under construction in Wyoming, on one map. Energy, data centers, critical minerals, uranium, carbon storage, and transmission, with developer, county, and permit status.

This is the free public face of Wyoming Development Intelligence. The paid tiers (pro and enterprise) add parcel and lease-position layers, wildlife overlays, and permit-change alerts.

## Stack

- Next.js 14, React 18, TypeScript
- MapLibre GL with OpenFreeMap tiles (no API key)
- Project data in `data/projects.json`, served at `/api/projects`

## Develop

```bash
npm install
npm run dev
```

## Data

Each project record carries `slug`, `type`, `status`, `developer`, `county`, approximate `lat`/`lng`, a one-paragraph `summary`, an `updated` date, and `sources`. Locations are approximate until replaced by agency-published footprints.

Planned feeds: Industrial Siting Council dockets, DEQ Class VI permits, WOGCC wells, OSLI leases, BLM ePlanning, WGFD sage-grouse core areas and migration corridors, county parcels.
