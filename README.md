# Wyoming Map

Clean slate. The previous product (Wyoming Development Intelligence — an energy,
data-center, minerals, and transmission project tracker) was removed to make room for a
new direction. Its full history is preserved in git at commit `46544a9` on `main`.

## What's here

A working Next.js + MapLibre foundation, product-neutral and ready for content:

- `components/WyomingMap.tsx` — MapLibre map bounded to Wyoming, using OpenFreeMap tiles
  (no API key). Takes an optional `MapPoint[]` and renders click-selectable markers.
- `components/MapCanvas.tsx` — client wrapper that keeps MapLibre out of the server bundle.
- `app/globals.css` — layout primitives and a neutral paper palette.

## Stack

- Next.js 14, React 18, TypeScript
- MapLibre GL with OpenFreeMap tiles

## Develop

```bash
npm install
npm run dev
```

## Next

The new product direction has not been scoped yet. Curated place data, live layers, and
page structure are all still open.
