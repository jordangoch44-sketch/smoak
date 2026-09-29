import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketplaceLandingShell } from "@/components/seo/MarketplaceLandingShell";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import {
  buildCityHubJsonLd,
  buildCityHubMetadata,
  buildLandingBreadcrumbJsonLd,
  filterTrainersForCity,
  marketplaceCityHubPath,
} from "@/lib/seo/marketplace-landing";
import { cityToSlug } from "@/lib/seo/marketplace-slugs";
import {
  publishedSearchPlaces,
  resolveSearchPlaceName,
} from "@/lib/seo/specialist-search-places";
import { MARKETPLACE_CITIES } from "@/data/locations";

interface PageProps {
  params: Promise<{ citySlug: string }>;
}

export const revalidate = 45;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { trainers } = await loadPublicCatalogForServer();
  const slugs = new Set(MARKETPLACE_CITIES.map((city) => cityToSlug(city)));
  for (const trainer of trainers) {
    for (const place of publishedSearchPlaces(trainer)) {
      const slug = cityToSlug(place);
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs].map((citySlug) => ({ citySlug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const { trainers: catalog } = await loadPublicCatalogForServer();
  const city = resolveSearchPlaceName(citySlug, catalog);
  if (!city) return { title: "Market not found" };
  return buildCityHubMetadata(city);
}

export default async function MarketplaceCityHubPage({ params }: PageProps) {
  const { citySlug } = await params;
  const { trainers: catalog } = await loadPublicCatalogForServer();
  const city = resolveSearchPlaceName(citySlug, catalog);
  if (!city) notFound();
  const trainers = filterTrainersForCity(catalog, city);

  const jsonLd = [
    buildCityHubJsonLd(city, trainers),
    buildLandingBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: city, path: marketplaceCityHubPath(city) },
    ]),
  ];

  return (
    <MarketplaceLandingShell
      city={city}
      trainers={trainers}
      jsonLd={jsonLd}
      title={`Health & fitness specialists in ${city}`}
      lede={`Search personal trainers, nutritionists, coaches, and wellness professionals in ${city}. Every profile includes specialties, session rates, and client reviews on SMOAC.`}
    />
  );
}
