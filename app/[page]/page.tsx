import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explorer from "@/components/Explorer";
import { LANDING_PAGES, getLandingPage, scopePlaces } from "@/lib/pages";
import { places } from "@/lib/places";
import { SITE_URL } from "@/lib/site";

// Every themed page is prerendered; anything not in LANDING_PAGES is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ page: p.slug }));
}

export function generateMetadata({ params }: { params: { page: string } }): Metadata {
  const page = getLandingPage(params.page);
  if (!page) return {};
  const url = `${SITE_URL}/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url },
  };
}

export default function LandingPage({ params }: { params: { page: string } }) {
  const page = getLandingPage(params.page);
  if (!page) notFound();
  return (
    <Explorer
      places={scopePlaces(places, page)}
      currentSlug={page.slug}
      intro={{ h1: page.h1, text: page.intro }}
      initialCategories={page.categories}
      bounds={page.bounds}
      firesDefault={page.firesDefault}
      firesFirst={page.firesFirst}
    />
  );
}
