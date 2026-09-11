"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./WyomingMap";

// MapLibre touches `window` at import time, so keep it out of the server bundle.
const WyomingMap = dynamic(() => import("./WyomingMap"), { ssr: false });

export default function MapCanvas({ points = [] }: { points?: MapPoint[] }) {
  return <WyomingMap points={points} />;
}
