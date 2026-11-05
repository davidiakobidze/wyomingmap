import type { Metadata } from "next";
import { Crumbs } from "@/components/hunt/Sheet";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import "../info.css";

const title = "Terms";
const description = `The terms for using ${SITE_NAME}: draw odds are estimates from past results, check everything with Wyoming Game and Fish, and outfitter listings aren't endorsements.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: { title: `${title} · ${SITE_NAME}`, description, url: `${SITE_URL}/terms` },
};

// TODO(owner): review this wording, ideally with a lawyer, then delete the
// .in-draft note below and update the date. Decisions it still needs:
//  - the legal name of whoever runs the site
//  - governing law and where disputes go (left out rather than guessed)
//  - listing terms: price, length and refunds, once listings can be bought
export default function TermsPage() {
  return (
    <main className="hs-wrap in-page">
      <Crumbs items={[{ href: "/", label: SITE_NAME }, { label: title }]} />
      <div className="hs-head">
        <h1>Terms</h1>
        <p className="answer">
          {SITE_NAME} helps you compare hunts. It doesn&apos;t replace Wyoming Game and Fish&apos;s rules, and it
          can&apos;t promise you a tag. By using the site, you agree to the terms below.
        </p>
        <p className="in-updated">Draft of November 5, 2026</p>
      </div>
      <p className="in-draft">
        <b>Draft, pending the site owner&apos;s review.</b> This is a plain-language description of how the site is meant
        to be used. It isn&apos;t legal advice.
      </p>

      <div className="in-body">
        <h2>Information only</h2>
        <p>
          Everything here is general information to help you plan. Odds and success rates are estimates from past published
          results, not predictions or guarantees. Quotas, applicant numbers, seasons, boundaries and regulations change,
          and we can make mistakes copying or calculating them.
        </p>
        <p>
          You are responsible for your own application and hunt. Before you apply or go afield, check licenses, deadlines,
          seasons, boundaries and rules with <a href="https://wgfd.wyo.gov">Wyoming Game and Fish</a>, whose published
          information takes priority over anything on this site. Maps here aren&apos;t for navigation, and they don&apos;t
          show whether you have permission to be on a piece of land.
        </p>

        <h2>Not a government site</h2>
        <p>
          {SITE_NAME} isn&apos;t affiliated with or endorsed by the Wyoming Game and Fish Department, the State of Wyoming or
          the State Board of Outfitters. You can&apos;t apply for or buy a license here.
        </p>

        <h2>Outfitter listings</h2>
        <p>
          Outfitters pay to be listed. A listing isn&apos;t an endorsement or a recommendation, and we don&apos;t guarantee
          an outfitter&apos;s services, availability or license status. Check the license with the{" "}
          <a href="https://outfitters.wyo.gov/outfitters">State Board of Outfitters</a> before you book. Any deal you make
          is between you and the outfitter.
        </p>
        <p>
          If you buy a listing, you confirm that what you give us is accurate, that you hold a current Wyoming outfitter
          license for the areas you list, and that you have the rights to any photo you send. We can decline or remove a
          listing that doesn&apos;t meet these terms.
        </p>

        <h2>Using the site</h2>
        <p>
          You&apos;re welcome to use the site and link to any page. Please don&apos;t disrupt it, try to get around its
          limits, or copy it wholesale to republish as your own. The underlying government data and OpenStreetMap map data
          remain under their own terms. The site&apos;s text, design and compilation are ours.
        </p>

        <h2>No warranty, and limits on liability</h2>
        <p>
          The site is provided &ldquo;as is&rdquo;, without warranties of any kind, and may change or go offline at any time.
          To the fullest extent the law allows, we aren&apos;t liable for losses that come from using or relying on it,
          including missed deadlines, unsuccessful applications, license or application fees, or travel and hunt costs.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms and will change the date above when we do. Continuing to use the site means you accept
          the current version. Questions go to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. The{" "}
          <a href="/privacy">privacy page</a> covers how we handle data.
        </p>
      </div>
    </main>
  );
}
