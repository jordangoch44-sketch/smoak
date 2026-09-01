import type { MetadataRoute } from "next";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import { SITE_ROUTES } from "@/lib/navigation";
import { absoluteUrl } from "@/lib/seo/site-url";
import {
  cityToSlug,
  listMarketplaceLandingPaths,
} from "@/lib/seo/marketplace-slugs";
import { MARKETPLACE_CITIES } from "@/data/locations";

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: SITE_ROUTES.home, priority: 1, changeFrequency: "daily" },
  { path: SITE_ROUTES.explore, priority: 0.9, changeFrequency: "daily" },
  { path: SITE_ROUTES.calorieCalculator, priority: 0.92, changeFrequency: "weekly" },
  { path: SITE_ROUTES.rankings, priority: 0.8, changeFrequency: "weekly" },
  { path: SITE_ROUTES.pricing, priority: 0.7, changeFrequency: "monthly" },
  { path: SITE_ROUTES.about, priority: 0.6, changeFrequency: "monthly" },
  { path: SITE_ROUTES.faq, priority: 0.6, changeFrequency: "monthly" },
  { path: SITE_ROUTES.contact, priority: 0.5, changeFrequency: "monthly" },
  { path: SITE_ROUTES.support, priority: 0.5, changeFrequency: "monthly" },
  { path: SITE_ROUTES.safety, priority: 0.5, changeFrequency: "monthly" },
  {
    path: SITE_ROUTES.communityGuidelines,
    priority: 0.4,
    changeFrequency: "monthly",
  },
  { path: SITE_ROUTES.report, priority: 0.4, changeFrequency: "monthly" },
  { path: SITE_ROUTES.privacy, priority: 0.3, changeFrequency: "yearly" },
  { path: SITE_ROUTES.terms, priority: 0.3, changeFrequency: "yearly" },
  { path: SITE_ROUTES.cookies, priority: 0.3, changeFrequency: "yearly" },
  { path: SITE_ROUTES.accessibility, priority: 0.3, changeFrequency: "yearly" },
  { path: SITE_ROUTES.join, priority: 0.7, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const { trainers } = await loadPublicCatalogForServer();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, changeFrequency }) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency,
      priority,
    })
  );

  const trainerEntries: MetadataRoute.Sitemap = trainers.map((trainer) => ({
    url: absoluteUrl(`/trainers/${encodeURIComponent(trainer.id)}`),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const cityHubEntries: MetadataRoute.Sitemap = MARKETPLACE_CITIES.map((city) => ({
    url: absoluteUrl(`/find/${cityToSlug(city)}`),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const professionLandingEntries: MetadataRoute.Sitemap =
    listMarketplaceLandingPaths().map(({ citySlug, professionSlug }) => ({
      url: absoluteUrl(`/find/${citySlug}/${professionSlug}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.82,
    }));

  return [
    ...staticEntries,
    ...cityHubEntries,
    ...professionLandingEntries,
    ...trainerEntries,
  ];
}
