import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · Wyoming elk and deer draw odds by hunt area`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Every Wyoming elk and deer hunt area on one map, with the preference points nonresidents needed and your own draw odds, from Wyoming Game and Fish's draw reports.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_NAME,
    description: TAGLINE,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  // Google Search Console's HTML-tag check, for a URL-prefix property. A
  // domain property verified by a DNS record at GoDaddy needs nothing here.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
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
