import type { MetadataRoute } from "next";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import { SITE_ROUTES } from "@/lib/navigation";
import { absoluteUrl } from "@/lib/seo/site-url";
import { isMarketplaceCity, MARKETPLACE_CITIES } from "@/data/locations";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import {
  cityToSlug,
  listMarketplaceLandingPaths,
  MARKETPLACE_PROFESSION_LANDINGS,
} from "@/lib/seo/marketplace-slugs";
import {
  publishedSearchPlaces,
  trainerServesSearchPlace,
} from "@/lib/seo/specialist-search-places";
import { trainerProfilePath } from "@/lib/trainer-profile-path";

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
    url: absoluteUrl(trainerProfilePath(trainer)),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const placeNames = new Set<string>(MARKETPLACE_CITIES);
  for (const trainer of trainers) {
    for (const place of publishedSearchPlaces(trainer)) placeNames.add(place);
  }

  const cityHubEntries: MetadataRoute.Sitemap = [...placeNames].map((city) => ({
    url: absoluteUrl(`/find/${cityToSlug(city)}`),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const professionPaths = new Map<string, { citySlug: string; professionSlug: string }>();
  for (const path of listMarketplaceLandingPaths()) {
    professionPaths.set(`${path.citySlug}/${path.professionSlug}`, path);
  }
  const extraPlaces = new Set<string>();
  for (const trainer of trainers) {
    for (const place of publishedSearchPlaces(trainer)) {
      if (!isMarketplaceCity(place)) extraPlaces.add(place);
    }
  }
  for (const place of extraPlaces) {
    for (const profession of MARKETPLACE_PROFESSION_LANDINGS) {
      const matches = trainers.some(
        (trainer) =>
          trainerServesSearchPlace(trainer, place) &&
          trainerMatchesProfessionCategory(trainer, profession.profession)
      );
      if (!matches) continue;
      const path = {
        citySlug: cityToSlug(place),
        professionSlug: profession.slug,
      };
      professionPaths.set(`${path.citySlug}/${path.professionSlug}`, path);
    }
  }

  const professionLandingEntries: MetadataRoute.Sitemap = [...professionPaths.values()].map(
    ({ citySlug, professionSlug }) => ({
      url: absoluteUrl(`/find/${citySlug}/${professionSlug}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.82,
    })
  );

  return [
    ...staticEntries,
    ...cityHubEntries,
    ...professionLandingEntries,
    ...trainerEntries,
  ];
}
