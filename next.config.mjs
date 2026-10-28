import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // maplibre-contour lists its "default" export condition first, which
    // webpack rejects; point straight at its ES module build.
    config.resolve.alias["maplibre-contour$"] = path.join(root, "node_modules/maplibre-contour/dist/index.mjs");
    return config;
  },
};

export default nextConfig;
