import type { MarketplaceCity } from "@/data/locations";
import { isMarketplaceCity } from "@/data/locations";

/** Longest-prefix wins — specific ZIP ranges before broad metro prefixes. */
const ZIP_PREFIX_RULES: readonly { prefix: string; city: MarketplaceCity }[] = [
  { prefix: "92024", city: "Encinitas" },
  { prefix: "92008", city: "Carlsbad" },
  { prefix: "92009", city: "Carlsbad" },
  { prefix: "92010", city: "Carlsbad" },
  { prefix: "92011", city: "Carlsbad" },
  { prefix: "92054", city: "Oceanside" },
  { prefix: "92056", city: "Oceanside" },
  { prefix: "92057", city: "Oceanside" },
  { prefix: "92025", city: "Escondido" },
  { prefix: "92026", city: "Escondido" },
  { prefix: "92027", city: "Escondido" },
  { prefix: "92029", city: "Escondido" },
  { prefix: "91910", city: "Chula Vista" },
  { prefix: "91911", city: "Chula Vista" },
  { prefix: "91913", city: "Chula Vista" },
  { prefix: "91914", city: "Chula Vista" },
  { prefix: "91915", city: "Chula Vista" },
  { prefix: "92590", city: "Temecula" },
  { prefix: "92591", city: "Temecula" },
  { prefix: "92592", city: "Temecula" },
  { prefix: "92562", city: "Temecula" },
  { prefix: "92563", city: "Temecula" },
  { prefix: "926", city: "Orange County" },
  { prefix: "927", city: "Orange County" },
  { prefix: "928", city: "Orange County" },
  { prefix: "902", city: "Los Angeles" },
  { prefix: "903", city: "Los Angeles" },
  { prefix: "904", city: "Los Angeles" },
  { prefix: "905", city: "Los Angeles" },
  { prefix: "900", city: "Los Angeles" },
  { prefix: "910", city: "Los Angeles" },
  { prefix: "912", city: "Los Angeles" },
  { prefix: "913", city: "Los Angeles" },
  { prefix: "914", city: "Los Angeles" },
  { prefix: "915", city: "Los Angeles" },
  { prefix: "916", city: "Los Angeles" },
  { prefix: "917", city: "Los Angeles" },
  { prefix: "918", city: "Los Angeles" },
  { prefix: "925", city: "Riverside" },
  { prefix: "921", city: "San Diego" },
  { prefix: "920", city: "San Diego" },
  { prefix: "919", city: "San Diego" },
] as const;

const FIVE_DIGIT_ZIP = /^\d{5}$/;

export function isValidZipCode(zip: string): boolean {
  return FIVE_DIGIT_ZIP.test(zip.trim());
}

export function normalizeZipCode(zip: string): string {
  return zip.replace(/\D/g, "").slice(0, 5);
}

/** Map a saved 5-digit ZIP to a marketplace city label. */
export function zipCodeToMarketplaceCity(zip: string): MarketplaceCity | null {
  const digits = normalizeZipCode(zip);
  if (!isValidZipCode(digits)) return null;

  for (const rule of ZIP_PREFIX_RULES) {
    if (digits.startsWith(rule.prefix)) return rule.city;
  }

  if (digits.startsWith("92")) return "San Diego";
  if (digits.startsWith("90") || digits.startsWith("91")) return "Los Angeles";

  return "San Diego";
}

export function assertMarketplaceCity(city: string): MarketplaceCity {
  return isMarketplaceCity(city) ? city : "San Diego";
}
