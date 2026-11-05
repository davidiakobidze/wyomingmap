import type { Metadata } from "next";
import { Crumbs } from "@/components/hunt/Sheet";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import "../info.css";

const title = "Privacy";
const description = `What ${SITE_NAME} collects, who handles it and how to have it removed: analytics, draw-season email alerts and saved preference points.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: { title: `${title} · ${SITE_NAME}`, description, url: `${SITE_URL}/privacy` },
};

// TODO(owner): review this wording, ideally with a lawyer, then delete the
// .in-draft note below and update the date. It also needs:
//  - who runs the site, and any legal or mailing address you want to give
//  - the payment provider, once outfitter listings can be bought
// The custom events and email alerts described here ship with the
// claude/draw-season-tracking PR. If you change what that PR collects, change this page.
export default function PrivacyPage() {
  return (
    <main className="hs-wrap in-page">
      <Crumbs items={[{ href: "/", label: SITE_NAME }, { label: title }]} />
      <div className="hs-head">
        <h1>Privacy</h1>
        <p className="answer">
          You don&apos;t need an account to use {SITE_NAME}. We collect anonymous usage counts, plus your email address
          if you sign up for alerts. We don&apos;t sell any of it.
        </p>
        <p className="in-updated">Draft of November 5, 2026</p>
      </div>
      <p className="in-draft">
        <b>Draft, pending the site owner&apos;s review.</b> This is a plain-language description of what the site does.
        It isn&apos;t legal advice.
      </p>

      <div className="in-body">
        <h2>Your preference points</h2>
        <p>
          The points you enter are saved in your own browser&apos;s local storage, so the odds stay set to your count when
          you come back. They aren&apos;t tied to your name or to any account. Clearing your browser&apos;s data for this
          site removes them. The site also sets a short-lived marker in session storage, so a return visit is counted only
          once per browser session.
        </p>

        <h2>Cookies</h2>
        <p>We don&apos;t set cookies, and we don&apos;t use advertising trackers.</p>

        <h2>Usage analytics</h2>
        <p>
          We use <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel Web Analytics</a> to see which pages get
          read. Vercel describes it as anonymous and free of third-party cookies. It tells visits apart using a hash made
          from the incoming request, and discards that hash after 24 hours. For each page view it may record:
        </p>
        <ul>
          <li>the time and the page address, including some filtered query parameters</li>
          <li>the site that referred you</li>
          <li>your approximate location: country, region and city</li>
          <li>your device type, operating system and browser</li>
        </ul>

        <h2>What we count on the page</h2>
        <p>We also record a few actions, to see whether the site is useful. Each sends only the details listed here:</p>
        <ul>
          <li>
            <b>Setting your points:</b> the species and point count, once you stop changing it.
          </li>
          <li>
            <b>Returning with saved points:</b> the species and point count, once per browser session.
          </li>
          <li>
            <b>Running a draw:</b> the page you ran it on and the license.
          </li>
          <li>
            <b>Searching the area finder:</b> <b>the first 60 characters of what you type</b> and the result you picked. Please
            search for places and hunt areas, and don&apos;t type personal details into this box.
          </li>
          <li>
            <b>Signing up for alerts:</b> the page you signed up on. Your email address isn&apos;t included.
          </li>
          <li>
            <b>Clicking &ldquo;Get listed&rdquo;:</b> the page it was clicked on.
          </li>
        </ul>
        <p>Most content blockers stop analytics, and the site works the same without it.</p>

        <h2>Draw-season email alerts</h2>
        <p>
          Where the signup form appears, it asks for your email address and nothing else. We use it to send one email before
          nonresident elk applications close and one on the day draw results post.
        </p>
        <p>
          The address is sent to <a href="https://resend.com/legal/privacy-policy">Resend</a>, the service that stores our
          mailing list and delivers the emails. We don&apos;t give it to outfitters, advertisers or anyone else.
        </p>
        <p>
          Every alert includes an unsubscribe link. Unsubscribing leaves your address on the list, marked so that it
          gets no more mail. To have it removed completely, email us. Otherwise we keep it until you ask us to remove it
          or we stop sending alerts.
        </p>

        <h2>Other services your browser or request reaches</h2>
        <ul>
          <li>
            <b>Hosting:</b> Vercel hosts the site. Like any web host, it handles technical request data, such as your IP
            address, to serve pages and keep the site running.
          </li>
          <li>
            <b>Map data:</b> your browser fetches map pieces directly from OpenFreeMap, Amazon Web Services and, for
            satellite imagery, the U.S. Geological Survey. Those services receive your IP address, as with any web request.
          </li>
          <li>
            <b>Outfitter sites:</b> links to outfitters leave this site, and their own privacy practices apply from there.
          </li>
        </ul>

        <h2>If you email us</h2>
        <p>
          Mail to our address passes through an email forwarding service to our inbox. We use what you send to reply, and
          keep it as long as we need it for that. If you&apos;re an outfitter with a listing, the details on it (business,
          name, town, license number, description, link and any photo) are public on the site, as you&apos;d expect.
        </p>

        <h2>Your choices</h2>
        <p>
          To ask what we hold about you, or to have it corrected or deleted, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Analytics records aren&apos;t tied to you, so we usually
          can&apos;t find or remove an individual&apos;s visits.
        </p>

        <h2>Children</h2>
        <p>The site is written for adults planning a hunt. It isn&apos;t aimed at children under 13, and we don&apos;t knowingly collect their email addresses.</p>

        <h2>Changes</h2>
        <p>If what we collect changes, we&apos;ll update this page and its date.</p>
      </div>
    </main>
  );
}
