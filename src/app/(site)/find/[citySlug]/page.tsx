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
import { listMarketplaceCitySlugs, slugToCity } from "@/lib/seo/marketplace-slugs";

interface PageProps {
  params: Promise<{ citySlug: string }>;
}

export const revalidate = 45;

export function generateStaticParams() {
  return listMarketplaceCitySlugs().map((citySlug) => ({ citySlug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const city = slugToCity(citySlug);
  if (!city) return { title: "Market not found" };
  return buildCityHubMetadata(city);
}

export default async function MarketplaceCityHubPage({ params }: PageProps) {
  const { citySlug } = await params;
  const city = slugToCity(citySlug);
  if (!city) notFound();

  const { trainers: catalog } = await loadPublicCatalogForServer();
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
