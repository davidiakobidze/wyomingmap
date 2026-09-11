import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const title = "Feature your business on the Wyoming map";
const description =
  "Put your hotel, outfitter, restaurant, or shop on the map visitors use to plan Yellowstone, Grand Teton, and Wyoming road trips. Simple monthly pricing, no contract.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/feature-your-business` },
  openGraph: { title, description, url: `${SITE_URL}/feature-your-business` },
};

const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Feature my business on Wyoming Map"
)}&body=${encodeURIComponent(
  "Business name:\nWhere it is (town or nearest park entrance):\nWebsite:\nWhat you do in one line:\n"
)}`;

export default function FeatureYourBusiness() {
  return (
    <main className="article">
      <nav className="crumbs">
        <a href="/">{SITE_NAME}</a> / Feature your business
      </nav>
      <h1>{title}</h1>
      <p className="lede">
        Visitors come to this map to decide where to go in Wyoming. A featured pin puts your
        business on it, right where they are looking.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>A highlighted pin on the map at your location, on every page where it is in view.</li>
        <li>Your name, one line about what you do, a photo, and a link to your site.</li>
        <li>A place in the sidebar list, so you show up even before someone zooms in.</li>
        <li>Monthly billing, cancel any time. No contract.</li>
      </ul>

      <h2>Who it fits</h2>
      <p>
        Lodging near a park entrance, guides and outfitters, restaurants, gear and rental
        shops, shuttles and tours. If a visitor planning a Wyoming trip should know you exist,
        this is where they are looking.
      </p>

      <h2>Pricing</h2>
      <p>
        $50 to $150 a month depending on placement. The map is new; the first businesses on it
        keep their rate.
      </p>

      <h2>Get on the map</h2>
      <p>
        Email <a href={mailto}>{CONTACT_EMAIL}</a> with your business name, where it is, and
        your website. You will hear back within two business days.
      </p>
      <p>
        <a className="button" href={mailto}>
          Email us about a featured pin
        </a>
      </p>

      <p className="fine">
        Featured pins are marked as sponsored on the map. We only list businesses that a
        visitor would genuinely be glad to find.
      </p>
    </main>
  );
}
