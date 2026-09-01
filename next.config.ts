import type { NextConfig } from "next";
import { getLanIpv4 } from "./scripts/lan-utils.mjs";

/**
 * Next.js 16 blocks /_next/* dev chunks when the browser’s host (e.g. 192.168.1.77)
 * is not on the allowlist — iPhone then shows HTML only (no React hydration).
 *
 * Wildcards like "192.168.*" do NOT match IP literals (four segments).
 * Prefer `npm run dev:lan` (sets SMOAC_LAN_HOST). We also auto-detect the Mac
 * LAN IP so plain `npm run dev` still hydrates on device.
 */
const lanHost = process.env.SMOAC_LAN_HOST?.trim() || getLanIpv4() || undefined;

const allowedDevOrigins = [
  "localhost",
  "*.localhost",
  "127.0.0.1",
  ...(lanHost ? [lanHost] : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  async redirects() {
    return [
      {
        source: "/founding-trainers",
        destination: "/founding-50",
        permanent: true,
      },
      {
        source: "/tools/calories",
        destination: "/calorie-calculator",
        permanent: true,
      },
      {
        source: "/api/founding-trainers/status",
        destination: "/api/founding-50/status",
        permanent: true,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  images: {
    qualities: [75, 90, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
      /* Supabase storage (specialist media, avatars) */
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
