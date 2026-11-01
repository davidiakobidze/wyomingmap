import type { Metadata } from "next";
import FinderSheet, { finderMeta } from "@/components/hunt/FinderSheet";
import { SITE_URL } from "@/lib/site";

const { title, description, path } = finderMeta("deer");

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE_URL}${path}` },
  openGraph: { title, description, url: `${SITE_URL}${path}` },
};

export default function DeerFinder() {
  return <FinderSheet species="deer" />;
}
