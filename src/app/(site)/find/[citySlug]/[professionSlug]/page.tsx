import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketplaceLandingShell } from "@/components/seo/MarketplaceLandingShell";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import {
  buildLandingBreadcrumbJsonLd,
  buildProfessionLandingJsonLd,
  buildProfessionLandingMetadata,
  filterTrainersForCityProfession,
  marketplaceCityHubPath,
  marketplaceProfessionLandingPath,
} from "@/lib/seo/marketplace-landing";
import {
  MARKETPLACE_PROFESSION_LANDINGS,
  cityToSlug,
  slugToProfessionLanding,
} from "@/lib/seo/marketplace-slugs";
import {
  publishedSearchPlaces,
  resolveSearchPlaceName,
  trainerServesSearchPlace,
} from "@/lib/seo/specialist-search-places";
import { isMarketplaceCity, MARKETPLACE_CITIES } from "@/data/locations";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";

interface PageProps {
  params: Promise<{ citySlug: string; professionSlug: string }>;
}

export const revalidate = 45;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { trainers } = await loadPublicCatalogForServer();
  const params: Array<{ citySlug: string; professionSlug: string }> = [];

  for (const city of MARKETPLACE_CITIES) {
    for (const profession of MARKETPLACE_PROFESSION_LANDINGS) {
      params.push({
        citySlug: cityToSlug(city),
        professionSlug: profession.slug,
      });
    }
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
      params.push({
        citySlug: cityToSlug(place),
        professionSlug: profession.slug,
      });
    }
  }

  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug, professionSlug } = await params;
  const { trainers: catalog } = await loadPublicCatalogForServer();
  const city = resolveSearchPlaceName(citySlug, catalog);
  const profession = slugToProfessionLanding(professionSlug);
  if (!city || !profession) return { title: "Page not found" };

  const specialists = filterTrainersForCityProfession(catalog, city, profession);
  return buildProfessionLandingMetadata(city, profession, specialists.length);
}

export default async function MarketplaceProfessionLandingPage({
  params,
}: PageProps) {
  const { citySlug, professionSlug } = await params;
  const { trainers: catalog } = await loadPublicCatalogForServer();
  const city = resolveSearchPlaceName(citySlug, catalog);
  const profession = slugToProfessionLanding(professionSlug);
  if (!city || !profession) notFound();

  const trainers = filterTrainersForCityProfession(catalog, city, profession);

  const jsonLd = [
    buildProfessionLandingJsonLd(city, profession, trainers),
    buildLandingBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: city, path: marketplaceCityHubPath(city) },
      {
        name: profession.pluralLabel,
        path: marketplaceProfessionLandingPath(city, profession),
      },
    ]),
  ];

  return (
    <MarketplaceLandingShell
      city={city}
      profession={profession}
      trainers={trainers}
      jsonLd={jsonLd}
      title={`${profession.pluralLabel} in ${city}`}
      lede={`Find ${profession.pluralLabel.toLowerCase()} for ${profession.searchPhrase} in ${city}. Compare verified SMOAC profiles, specialties, reviews, and session rates — then contact specialists directly.`}
    />
  );
}
