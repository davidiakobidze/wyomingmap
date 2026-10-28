import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";
import HuntHeader from "@/components/hunt/HuntHeader";
import { ELK_YEAR } from "@/lib/elk";
import { SITE_NAME } from "@/lib/site";
import "./hunting.css";

// The hunting pages are drawn as survey sheets: paper, ink, a serif for names
// and a mono for numbers. Fonts are self-hosted by next/font.
const serif = Newsreader({ subsets: ["latin"], axes: ["opsz"], variable: "--f-serif", display: "swap" });
const sans = Public_Sans({ subsets: ["latin"], variable: "--f-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });

export default function HuntingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`hs ${serif.variable} ${sans.variable} ${mono.variable}`}>
      <HuntHeader siteName={SITE_NAME} year={ELK_YEAR} />
      {children}
    </div>
  );
}
