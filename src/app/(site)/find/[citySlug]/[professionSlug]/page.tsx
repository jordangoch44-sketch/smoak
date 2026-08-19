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
  listMarketplaceLandingPaths,
  slugToCity,
  slugToProfessionLanding,
} from "@/lib/seo/marketplace-slugs";

interface PageProps {
  params: Promise<{ citySlug: string; professionSlug: string }>;
}

export const revalidate = 45;

export function generateStaticParams() {
  return listMarketplaceLandingPaths();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug, professionSlug } = await params;
  const city = slugToCity(citySlug);
  const profession = slugToProfessionLanding(professionSlug);
  if (!city || !profession) return { title: "Page not found" };

  const { trainers: catalog } = await loadPublicCatalogForServer();
  const specialists = filterTrainersForCityProfession(catalog, city, profession);
  return buildProfessionLandingMetadata(city, profession, specialists.length);
}

export default async function MarketplaceProfessionLandingPage({
  params,
}: PageProps) {
  const { citySlug, professionSlug } = await params;
  const city = slugToCity(citySlug);
  const profession = slugToProfessionLanding(professionSlug);
  if (!city || !profession) notFound();

  const { trainers: catalog } = await loadPublicCatalogForServer();
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
