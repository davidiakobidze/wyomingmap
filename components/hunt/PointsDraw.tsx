"use client";

import { License } from "@/lib/license";
import { Species, usePoints } from "@/lib/points";
import DotDraw from "./DotDraw";

// The dot draw outside a draw board, at the reader's own points.
export default function PointsDraw(props: { l: License; species: Species; year: number; where: string; title?: React.ReactNode }) {
  const pts = usePoints(props.species);
  return <DotDraw {...props} pts={pts} />;
}
