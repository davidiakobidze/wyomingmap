import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wyoming Map · Everything under construction in Wyoming",
  description:
    "Live map of Wyoming's energy, data-center, mining, and transmission projects with permit status, developer, and county.",
  metadataBase: new URL("https://wyomingmap.com"),
  openGraph: {
    title: "Wyoming Map",
    description: "Everything under construction in Wyoming, on one map.",
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
