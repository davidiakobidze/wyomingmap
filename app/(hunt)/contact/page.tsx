import type { Metadata } from "next";
import { Crumbs } from "@/components/hunt/Sheet";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import "../info.css";

const title = "Contact";
const description = `How to reach ${SITE_NAME}: outfitter listings, corrections to the draw data, and privacy requests.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { title: `${title} · ${SITE_NAME}`, description, url: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <main className="hs-wrap in-page">
      <Crumbs items={[{ href: "/", label: SITE_NAME }, { label: title }]} />
      <div className="hs-head">
        <h1>Contact</h1>
        <p className="answer">Email is the way to reach us.</p>
      </div>

      <div className="in-body">
        <p className="in-mail">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <h2>Write to us about</h2>
        <ul>
          <li>
            <b>A wrong number or date.</b> Tell us the page and the license, and where you saw the correct figure if you
            can.
          </li>
          <li>
            <b>Outfitter listings.</b> Tell us your business name, Wyoming outfitter license number, the areas you guide
            in and your website.
          </li>
          <li>
            <b>Your data.</b> Ask us to remove your email address from the draw alerts or to delete anything else we hold
            about you. The <a href="/privacy">privacy page</a> says what that covers.
          </li>
        </ul>

        <h2>Licenses and applications</h2>
        <p>
          We can&apos;t see or change your application, your preference points or your draw results, because this site
          isn&apos;t part of the state&apos;s system. For those, contact{" "}
          <a href="https://wgfd.wyo.gov">Wyoming Game and Fish</a>.
        </p>
      </div>
    </main>
  );
}
