import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The visitor map is switched off; its old pages land on the hunting home
  // until a new map gets its own address. Temporary, so they can come back.
  async redirects() {
    return [
      ...["yellowstone", "grand-teton", "scenic-drives", "photo-spots", "wildfires", "feature-your-business"].map(
        (slug) => ({ source: `/${slug}`, destination: "/", permanent: false })
      ),
      // One address for search engines: www and the production vercel.app
      // aliases serve the same site, so send them to the apex domain.
      ...["www.wyomingmap.com", "wyomingmap.vercel.app", "wyomingmap-three.vercel.app"].map((host) => ({
        source: "/:path*",
        has: [{ type: "host", value: host }],
        destination: "https://wyomingmap.com/:path*",
        permanent: true,
      })),
    ];
  },
  webpack(config) {
    // maplibre-contour lists its "default" export condition first, which
    // webpack rejects; point straight at its ES module build.
    config.resolve.alias["maplibre-contour$"] = path.join(root, "node_modules/maplibre-contour/dist/index.mjs");
    return config;
  },
};

export default nextConfig;
