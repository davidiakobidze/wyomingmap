import { Fraunces } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import HuntHeader from "@/components/hunt/HuntHeader";
import Motion from "@/components/hunt/Motion";
import { ELK_SOURCES, ELK_YEAR } from "@/lib/elk";
import { SITE_NAME } from "@/lib/site";
import "./hunting.css";

// First Light: the hunting pages drawn as the hour before sunrise on opening
// morning. A soft serif for names and numbers, Geist for everything else.
// Fonts are self-hosted by next/font.
const serif = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
  variable: "--f-serif",
  display: "swap",
});

export default function HuntingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`hs ${serif.variable} ${GeistSans.variable} ${GeistMono.variable}`}>
      <HuntHeader siteName={SITE_NAME} />
      {children}
      <footer className="fl-foot">
        <span>
          Draw odds from <a href={ELK_SOURCES.odds}>Wyoming Game and Fish {ELK_YEAR} draw results</a>. Terrain from AWS
          Terrain Tiles; base map © OpenStreetMap.
        </span>
        <span>
          <a href="/hunting/elk">Elk areas</a> · <a href="/hunting/deer">Deer areas</a>
        </span>
      </footer>
      <Motion />
    </div>
  );
}
