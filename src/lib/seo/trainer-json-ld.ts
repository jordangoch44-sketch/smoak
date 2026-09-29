import { trainingOptionCardsFromTrainer } from "@/lib/profile-details-visual";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { absoluteUrl } from "@/lib/seo/site-url";
import {
  indexableLocality,
  primarySearchPlaces,
} from "@/lib/seo/specialist-search-places";
import { sanitizeMarketplaceSpecialties } from "@/lib/specialty-display";
import { parseTravelRadiusMiles, resolveTravelToClients } from "@/lib/specialist-service-area";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import {
  hasSessionPrice,
  resolveTrainerSessionPriceRange,
} from "@/lib/session-price";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(value);
  }
  return next;
}

export function buildTrainerProfileJsonLd(trainer: Trainer): Record<string, unknown> {
  const profession =
    resolveTrainerProfessionCategory(trainer) ||
    trainer.profession?.trim() ||
    "Wellness Specialist";
  const places = primarySearchPlaces(trainer, 12);
  const locality = indexableLocality(trainer);
  const profileUrl = absoluteUrl(trainerProfilePath(trainer));
  const coords = getTrainerCoordinates(trainer);
  const image =
    trainer.heroImage?.trim() ||
    trainer.image?.trim() ||
    trainer.galleryImages?.[0]?.trim() ||
    undefined;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    additionalType: "https://schema.org/HealthAndBeautyBusiness",
    name: trainer.name,
    description:
      trainer.bio?.trim() ||
      trainer.title?.trim() ||
      (places.length > 0
        ? `${trainer.name} offers ${profession.toLowerCase()} in ${places.join(", ")}.`
        : `${trainer.name} — ${profession} on SMOAC.`),
    url: profileUrl,
    ...(image ? { image } : {}),
  };

  const street =
    trainer.locationPrecision === "address" ? trainer.workAddress?.trim() ?? "" : "";
  if (locality || street || trainer.zipCode?.trim() || trainer.state?.trim()) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      ...(locality ? { addressLocality: locality } : {}),
      ...(trainer.state?.trim() ? { addressRegion: trainer.state.trim() } : {}),
      ...(trainer.zipCode?.trim()
        ? { postalCode: trainer.zipCode.trim() }
        : {}),
      addressCountry: "US",
    };
  }

  const areaServed: Record<string, unknown>[] = places.map((name) => ({
    "@type": "City",
    name,
  }));
  if (coords && resolveTravelToClients(trainer) === "yes") {
    const miles =
      parseTravelRadiusMiles(trainer.travelRadius ?? "") ||
      (typeof trainer.serviceRadiusMiles === "number"
        ? trainer.serviceRadiusMiles
        : 0);
    if (miles > 0) {
      areaServed.push({
        "@type": "GeoCircle",
        geoMidpoint: {
          "@type": "GeoCoordinates",
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        geoRadius: String(Math.round(miles * 1609.344)),
      });
    }
  }
  if (areaServed.length === 1) {
    jsonLd.areaServed = areaServed[0];
  } else if (areaServed.length > 1) {
    jsonLd.areaServed = areaServed;
  }

  const services = uniqueNames([
    profession,
    ...sanitizeMarketplaceSpecialties(trainer.specialty),
    ...trainingOptionCardsFromTrainer(trainer).map((card) => card.title),
  ]);
  if (services.length > 0) {
    jsonLd.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((name) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name,
        },
      })),
    };
  }

  if (coords) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  const sessionPrice = resolveTrainerSessionPriceRange(trainer);
  if (hasSessionPrice(sessionPrice)) {
    jsonLd.makesOffer =
      sessionPrice.min === sessionPrice.max
        ? {
            "@type": "Offer",
            price: sessionPrice.max,
            priceCurrency: "USD",
            description: "Per session",
          }
        : {
            "@type": "AggregateOffer",
            lowPrice: sessionPrice.min,
            highPrice: sessionPrice.max,
            priceCurrency: "USD",
            description: "Per session",
          };
  }

  if (trainer.reviewCount > 0 && trainer.rating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: trainer.rating,
      reviewCount: trainer.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}
