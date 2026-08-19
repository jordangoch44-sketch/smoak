import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/internal/",
        "/client-dashboard",
        "/specialist-dashboard",
        "/login",
        "/complete-account",
        "/create-account",
        "/founding-trainers",
        "/saved",
        "/profile",
        "/tap-test",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
