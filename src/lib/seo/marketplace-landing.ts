import { buildExploreSearchParams } from "@/lib/explore-url";
import { formatProviderLocation } from "@/lib/provider-location";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { absoluteUrl } from "@/lib/seo/site-url";
import {
  cityToSlug,
  type MarketplaceProfessionLanding,
} from "@/lib/seo/marketplace-slugs";
import type { MarketplaceCity } from "@/data/locations";
import type { Trainer } from "@/types/trainer";
import type { Metadata } from "next";

export function trainerMatchesMarketplaceCity(
  trainer: Trainer,
  city: MarketplaceCity
): boolean {
  return trainer.city.trim().toLowerCase() === city.trim().toLowerCase();
}

export function filterTrainersForCity(
  trainers: Trainer[],
  city: MarketplaceCity
): Trainer[] {
  return trainers.filter((trainer) => trainerMatchesMarketplaceCity(trainer, city));
}

export function filterTrainersForCityProfession(
  trainers: Trainer[],
  city: MarketplaceCity,
  profession: MarketplaceProfessionLanding
): Trainer[] {
  return filterTrainersForCity(trainers, city).filter((trainer) =>
    trainerMatchesProfessionCategory(trainer, profession.profession)
  );
}

export function marketplaceCityHubPath(city: MarketplaceCity): string {
  return `/find/${cityToSlug(city)}`;
}

export function marketplaceProfessionLandingPath(
  city: MarketplaceCity,
  profession: MarketplaceProfessionLanding
): string {
  return `/find/${cityToSlug(city)}/${profession.slug}`;
}

export function buildExploreHrefForLanding(
  city: MarketplaceCity,
  profession?: MarketplaceProfessionLanding
): string {
  const query = buildExploreSearchParams(
    {
      zipCode: "",
      city,
      neighborhood: "",
      profession: profession?.profession ?? "",
      specialty: "",
      gender: "",
      priceMin: "",
      priceMax: "",
      serviceType: "",
    },
    profession?.searchPhrase ?? `${city} wellness specialists`
  );
  return query ? `/explore?${query}` : "/explore";
}

export function buildCityHubMetadata(city: MarketplaceCity): Metadata {
  const title = `Health & Fitness Specialists in ${city}`;
  const description = `Find personal trainers, nutritionists, coaches, and wellness professionals in ${city}. Compare SMOAC profiles, reviews, and session rates.`;
  const canonical = absoluteUrl(marketplaceCityHubPath(city));

  return {
    title,
    description,
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
  city: MarketplaceCity,
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
  city: MarketplaceCity,
  trainers: Trainer[]
): Record<string, unknown> {
  const pageUrl = absoluteUrl(marketplaceCityHubPath(city));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Health & fitness specialists in ${city}`,
    description: `Directory of wellness professionals in ${city} on SMOAC.`,
    url: pageUrl,
    mainEntity: buildTrainerItemList(trainers),
  };
}

export function buildProfessionLandingJsonLd(
  city: MarketplaceCity,
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
    about: {
      "@type": "Thing",
      name: profession.searchPhrase,
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
      url: absoluteUrl(`/trainers/${encodeURIComponent(trainer.id)}`),
    })),
  };
}

export function landingTrainerLocationLine(trainer: Trainer): string {
  return formatProviderLocation(trainer) || trainer.city || "";
}
