import { isMarketplaceCity, type MarketplaceCity } from "@/data/locations";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { haversineMiles } from "@/lib/geo/haversine";
import {
  zipCodeToCoordinates,
  type GeoCoordinates,
} from "@/lib/geo/zip-centroids";
import { findZipForPlaceName } from "@/lib/geo/zip-place-names";
import { MARKETPLACE_CITY_CENTERS } from "@/lib/marketplace-city-centers";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { absoluteUrl } from "@/lib/seo/site-url";
import {
  cityToSlug,
  type MarketplaceProfessionLanding,
} from "@/lib/seo/marketplace-slugs";
import {
  formatIndexableProviderLocation,
  parentMarketplaceCityForPlace,
  trainerBasedInSearchPlace,
  trainerServesSearchPlace,
} from "@/lib/seo/specialist-search-places";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";
import type { Metadata } from "next";

function cityCenter(city: MarketplaceCity): GeoCoordinates {
  const center = MARKETPLACE_CITY_CENTERS[city];
  return { latitude: center.lat, longitude: center.lng };
}

/** Neighborhood ZIP centroid, else the city it belongs to. */
function searchPlaceCenter(place: string): GeoCoordinates | null {
  if (isMarketplaceCity(place)) return cityCenter(place);
  const zip = findZipForPlaceName(place);
  const fromZip = zip ? zipCodeToCoordinates(zip) : null;
  if (fromZip) return fromZip;
  const parent = parentMarketplaceCityForPlace(place);
  return parent ? cityCenter(parent) : null;
}

function secondLocationCoordinates(trainer: Trainer): GeoCoordinates | null {
  const { latitude2: lat, longitude2: lng } = trainer;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  ) {
    return { latitude: lat, longitude: lng };
  }
  return trainer.zipCode2 ? zipCodeToCoordinates(trainer.zipCode2) : null;
}

function milesFromPlace(trainer: Trainer, center: GeoCoordinates): number | null {
  const distances = [getTrainerCoordinates(trainer), secondLocationCoordinates(trainer)]
    .filter((point): point is GeoCoordinates => point !== null)
    .map((point) =>
      haversineMiles(center.latitude, center.longitude, point.latitude, point.longitude)
    );
  return distances.length > 0 ? Math.min(...distances) : null;
}

/** Closest to the place first; no location last; then rating. */
function sortTrainersNearPlace(trainers: Trainer[], place: string): Trainer[] {
  const center = searchPlaceCenter(place);
  return trainers
    .map((trainer) => ({
      trainer,
      miles: center ? milesFromPlace(trainer, center) : null,
    }))
    .sort((a, b) => {
      if (a.miles !== null && b.miles !== null && a.miles !== b.miles) {
        return a.miles - b.miles;
      }
      if ((a.miles === null) !== (b.miles === null)) {
        return a.miles === null ? 1 : -1;
      }
      if (b.trainer.rating !== a.trainer.rating) {
        return b.trainer.rating - a.trainer.rating;
      }
      return b.trainer.reviewCount - a.trainer.reviewCount;
    })
    .map((entry) => entry.trainer);
}

function matchesLandingProfession(
  trainer: Trainer,
  profession?: MarketplaceProfessionLanding
): boolean {
  return !profession || trainerMatchesProfessionCategory(trainer, profession.profession);
}

/** Specialists based in the place, closest first. */
export function filterTrainersForCity(
  trainers: Trainer[],
  city: string,
  profession?: MarketplaceProfessionLanding
): Trainer[] {
  return sortTrainersNearPlace(
    trainers.filter(
      (trainer) =>
        trainerBasedInSearchPlace(trainer, city) &&
        matchesLandingProfession(trainer, profession)
    ),
    city
  );
}

export function filterTrainersForCityProfession(
  trainers: Trainer[],
  city: string,
  profession: MarketplaceProfessionLanding
): Trainer[] {
  return filterTrainersForCity(trainers, city, profession);
}

/** Based elsewhere but list the place as a travel area, closest first. */
export function filterTravelingTrainersForCity(
  trainers: Trainer[],
  city: string,
  profession?: MarketplaceProfessionLanding
): Trainer[] {
  return sortTrainersNearPlace(
    trainers.filter(
      (trainer) =>
        trainerServesSearchPlace(trainer, city) &&
        !trainerBasedInSearchPlace(trainer, city) &&
        matchesLandingProfession(trainer, profession)
    ),
    city
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
