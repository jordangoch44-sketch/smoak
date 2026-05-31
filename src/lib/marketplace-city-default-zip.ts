import type { MarketplaceCity } from "@/data/locations";
import { MARKETPLACE_CITIES } from "@/data/locations";

/** Representative ZIP when a user picks a marketplace city from search */
const CITY_DEFAULT_ZIP: Record<MarketplaceCity, string> = {
  "San Diego": "92101",
  "Los Angeles": "90012",
  "Orange County": "92614",
  Riverside: "92501",
  Temecula: "92590",
  "Chula Vista": "91910",
  Oceanside: "92054",
  Carlsbad: "92008",
  Encinitas: "92024",
  Escondido: "92025",
};

export function getDefaultZipForMarketplaceCity(
  city: string
): string | null {
  if (!MARKETPLACE_CITIES.includes(city as MarketplaceCity)) return null;
  return CITY_DEFAULT_ZIP[city as MarketplaceCity];
}
