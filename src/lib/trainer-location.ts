import { MARKETPLACE_CITY_CENTERS } from "@/lib/marketplace-city-centers";
import type { MarketplaceCity } from "@/data/locations";
import { isMarketplaceCity } from "@/data/locations";
import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
import type { Trainer } from "@/types";

export function getTrainerCoordinates(trainer: Trainer): GeoCoordinates | null {
  if (
    Number.isFinite(trainer.latitude) &&
    Number.isFinite(trainer.longitude)
  ) {
    return { latitude: trainer.latitude, longitude: trainer.longitude };
  }

  const fromZip = trainer.zipCode
    ? zipCodeToCoordinates(trainer.zipCode)
    : null;
  if (fromZip) return fromZip;

  if (isMarketplaceCity(trainer.city)) {
    const center =
      MARKETPLACE_CITY_CENTERS[trainer.city as MarketplaceCity];
    return { latitude: center.lat, longitude: center.lng };
  }

  return null;
}

export function trainerHasResolvableCoordinates(trainer: Trainer): boolean {
  return getTrainerCoordinates(trainer) !== null;
}
