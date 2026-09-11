import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wyoming Map · Parks, scenic drives, and photo spots",
  description:
    "A curated map of Wyoming for visitors: Yellowstone and Grand Teton, the best scenic drives, and where to stand for the photo.",
  metadataBase: new URL("https://wyomingmap.com"),
  openGraph: {
    title: "Wyoming Map",
    description: "One view to understand Wyoming.",
    url: "https://wyomingmap.com",
    siteName: "Wyoming Map",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
