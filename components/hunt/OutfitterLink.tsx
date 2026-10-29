"use client";

import { track } from "@/lib/track";

// The outfitter listing's mail link, counted: each click is a lead.
export default function OutfitterLink({ href, where }: { href: string; where: string }) {
  return (
    <a className="hs-btn dark" href={href} onClick={() => track("outfitter_click", { where })}>
      Get listed
    </a>
  );
}
