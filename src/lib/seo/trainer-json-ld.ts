import { formatProviderLocation } from "@/lib/provider-location";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { absoluteUrl } from "@/lib/seo/site-url";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import type { Trainer } from "@/types/trainer";

export function buildTrainerProfileJsonLd(trainer: Trainer): Record<string, unknown> {
  const profession =
    resolveTrainerProfessionCategory(trainer) ||
    trainer.profession?.trim() ||
    "Wellness Specialist";
  const locationLine = formatProviderLocation(trainer);
  const profileUrl = absoluteUrl(`/trainers/${encodeURIComponent(trainer.id)}`);
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
      `${trainer.name} — ${profession} on SMOAC.`,
    url: profileUrl,
    ...(image ? { image } : {}),
  };

  if (trainer.city?.trim() || trainer.zipCode?.trim() || trainer.state?.trim()) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(trainer.city?.trim()
        ? { addressLocality: trainer.city.trim() }
        : {}),
      ...(trainer.state?.trim() ? { addressRegion: trainer.state.trim() } : {}),
      ...(trainer.zipCode?.trim()
        ? { postalCode: trainer.zipCode.trim() }
        : {}),
      addressCountry: "US",
    };
  }

  if (locationLine) {
    jsonLd.areaServed = locationLine;
  }

  if (coords) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  if (trainer.pricePerSession > 0) {
    jsonLd.makesOffer = {
      "@type": "Offer",
      price: trainer.pricePerSession,
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
