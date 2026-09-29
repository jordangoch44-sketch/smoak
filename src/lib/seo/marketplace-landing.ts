import { isMarketplaceCity } from "@/data/locations";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { absoluteUrl } from "@/lib/seo/site-url";
import {
  cityToSlug,
  type MarketplaceProfessionLanding,
} from "@/lib/seo/marketplace-slugs";
import {
  formatIndexableProviderLocation,
  parentMarketplaceCityForPlace,
  trainerServesSearchPlace,
} from "@/lib/seo/specialist-search-places";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";
import type { Metadata } from "next";

/** Profile matches a place search, including neighborhoods that roll up to a city. */
export function trainerMatchesMarketplaceCity(
  trainer: Trainer,
  city: string
): boolean {
  return trainerServesSearchPlace(trainer, city);
}

export function filterTrainersForCity(
  trainers: Trainer[],
  city: string
): Trainer[] {
  return trainers.filter((trainer) => trainerServesSearchPlace(trainer, city));
}

export function filterTrainersForCityProfession(
  trainers: Trainer[],
  city: string,
  profession: MarketplaceProfessionLanding
): Trainer[] {
  return filterTrainersForCity(trainers, city).filter((trainer) =>
    trainerMatchesProfessionCategory(trainer, profession.profession)
  );
}

export function marketplaceCityHubPath(city: string): string {
  return `/find/${cityToSlug(city)}`;
}

export function marketplaceProfessionLandingPath(
  city: string,
  profession: MarketplaceProfessionLanding
): string {
  return `/find/${cityToSlug(city)}/${profession.slug}`;
}

export function buildExploreHrefForLanding(
  city: string,
  profession?: MarketplaceProfessionLanding
): string {
  const parent = parentMarketplaceCityForPlace(city);
  const marketplaceCity = isMarketplaceCity(city)
    ? city
    : parent && isMarketplaceCity(parent)
      ? parent
      : "";
  const neighborhood = marketplaceCity && !isMarketplaceCity(city) ? city : "";
  const query = buildExploreSearchParams(
    {
      zipCode: "",
      city: marketplaceCity || city,
      neighborhood,
      profession: profession?.profession ?? "",
      specialty: "",
      gender: "",
      priceMin: "",
      priceMax: "",
      serviceType: "",
    },
    profession?.searchPhrase
      ? `${profession.searchPhrase} in ${city}`
      : `${city} wellness specialists`
  );
  return query ? `/explore?${query}` : "/explore";
}

export function buildCityHubMetadata(city: string): Metadata {
  const title = `Health & Fitness Specialists in ${city}`;
  const description = `Find personal trainers, nutritionists, coaches, and wellness professionals in ${city}. Compare SMOAC profiles, reviews, and session rates.`;
  const canonical = absoluteUrl(marketplaceCityHubPath(city));

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
  };
}

export function buildProfessionLandingMetadata(
  city: string,
  profession: MarketplaceProfessionLanding,
  specialistCount: number
): Metadata {
  const title = `${profession.pluralLabel} in ${city}`;
  const countLine =
    specialistCount > 0
      ? `${specialistCount} verified ${specialistCount === 1 ? profession.singularLabel.toLowerCase() : profession.pluralLabel.toLowerCase()} on SMOAC.`
      : `Browse ${profession.searchPhrase} professionals in ${city} on SMOAC.`;
  const description = `Find ${profession.pluralLabel.toLowerCase()} in ${city}. ${countLine} Compare profiles, client reviews, specialties, and session rates.`;
  const canonical = absoluteUrl(
    marketplaceProfessionLandingPath(city, profession)
  );

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
  };
}

export function buildCityHubJsonLd(
  city: string,
  trainers: Trainer[]
): Record<string, unknown> {
  const pageUrl = absoluteUrl(marketplaceCityHubPath(city));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Health & fitness specialists in ${city}`,
    description: `Directory of wellness professionals in ${city} on SMOAC.`,
    url: pageUrl,
    spatialCoverage: { "@type": "City", name: city },
    mainEntity: buildTrainerItemList(trainers),
  };
}

export function buildProfessionLandingJsonLd(
  city: string,
  profession: MarketplaceProfessionLanding,
  trainers: Trainer[]
): Record<string, unknown> {
  const pageUrl = absoluteUrl(marketplaceProfessionLandingPath(city, profession));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${profession.pluralLabel} in ${city}`,
    description: `Find ${profession.pluralLabel.toLowerCase()} in ${city} on SMOAC.`,
    url: pageUrl,
    spatialCoverage: { "@type": "City", name: city },
    about: {
      "@type": "Thing",
      name: `${profession.searchPhrase} in ${city}`,
    },
    mainEntity: buildTrainerItemList(trainers),
  };
}

export function buildLandingBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function buildTrainerItemList(
  trainers: Trainer[]
): Record<string, unknown> {
  return {
    "@type": "ItemList",
    numberOfItems: trainers.length,
    itemListElement: trainers.map((trainer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: trainer.name,
      url: absoluteUrl(trainerProfilePath(trainer)),
    })),
  };
}

export function landingTrainerLocationLine(trainer: Trainer): string {
  return formatIndexableProviderLocation(trainer) || trainer.city || "";
}
