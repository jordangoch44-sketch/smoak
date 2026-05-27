import type { NextConfig } from "next";

/**
 * Next.js 16 blocks /_next/* dev chunks when the browser’s host (e.g. 192.168.1.77)
 * is not on the allowlist — iPhone then shows HTML only (no React hydration).
 *
 * Wildcards like "192.168.*" do NOT match IP literals (four segments).
 * Set SMOAC_LAN_HOST when using npm run dev:lan (scripts/dev-lan.mjs does this).
 */
const lanHost = process.env.SMOAC_LAN_HOST?.trim();

const allowedDevOrigins = [
  "localhost",
  "*.localhost",
  "127.0.0.1",
  ...(lanHost ? [lanHost] : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
};

export default nextConfig;
