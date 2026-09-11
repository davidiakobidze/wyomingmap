import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · Parks, scenic drives, photo spots, and wildfires`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "A curated map of Wyoming for visitors: Yellowstone and Grand Teton, the best scenic drives, where to stand for the photo, and what is burning right now.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_NAME,
    description: TAGLINE,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
