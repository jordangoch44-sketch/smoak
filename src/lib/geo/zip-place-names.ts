import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

/** USPS / Zippopotam place name tied to a ZIP — never paired with a different ZIP */
export interface ZipPlaceRecord {
  placeName: string;
  state: string;
}

/**
 * Local ZIP → neighborhood / city label (primary source for display + personalization).
 * Overrides broad marketplace metro names so 92129 ≠ "San Diego".
 */
const ZIP_PLACE_NAMES: Record<string, ZipPlaceRecord> = {
  "91910": { placeName: "Chula Vista", state: "CA" },
  "91911": { placeName: "Chula Vista", state: "CA" },
  "92008": { placeName: "Carlsbad", state: "CA" },
  "92024": { placeName: "Encinitas", state: "CA" },
  "92025": { placeName: "Escondido", state: "CA" },
  "92037": { placeName: "La Jolla", state: "CA" },
  "92054": { placeName: "Oceanside", state: "CA" },
  "92101": { placeName: "Downtown San Diego", state: "CA" },
  "92102": { placeName: "Southeast San Diego", state: "CA" },
  "92103": { placeName: "Hillcrest", state: "CA" },
  "92104": { placeName: "North Park", state: "CA" },
  "92105": { placeName: "City Heights", state: "CA" },
  "92106": { placeName: "Point Loma", state: "CA" },
  "92107": { placeName: "Ocean Beach", state: "CA" },
  "92108": { placeName: "Mission Valley", state: "CA" },
  "92109": { placeName: "Pacific Beach", state: "CA" },
  "92110": { placeName: "Bay Park", state: "CA" },
  "92111": { placeName: "Linda Vista", state: "CA" },
  "92113": { placeName: "Logan Heights", state: "CA" },
  "92114": { placeName: "Encanto", state: "CA" },
  "92115": { placeName: "College Area", state: "CA" },
  "92116": { placeName: "Normal Heights", state: "CA" },
  "92117": { placeName: "Clairemont", state: "CA" },
  "92118": { placeName: "Coronado", state: "CA" },
  "92119": { placeName: "San Carlos", state: "CA" },
  "92120": { placeName: "San Carlos", state: "CA" },
  "92121": { placeName: "Sorrento Valley", state: "CA" },
  "92122": { placeName: "University City", state: "CA" },
  "92123": { placeName: "Kearny Mesa", state: "CA" },
  "92124": { placeName: "Tierrasanta", state: "CA" },
  "92126": { placeName: "Mira Mesa", state: "CA" },
  "92127": { placeName: "Rancho Bernardo", state: "CA" },
  "92128": { placeName: "Rancho Bernardo", state: "CA" },
  "92129": { placeName: "Rancho Peñasquitos", state: "CA" },
  "92130": { placeName: "Carmel Valley", state: "CA" },
  "92131": { placeName: "Scripps Ranch", state: "CA" },
  "92132": { placeName: "San Diego", state: "CA" },
  "92134": { placeName: "San Diego", state: "CA" },
  "92135": { placeName: "Naval Base San Diego", state: "CA" },
  "92136": { placeName: "Naval Base San Diego", state: "CA" },
  "92139": { placeName: "Paradise Hills", state: "CA" },
  "92140": { placeName: "Naval Air Station North Island", state: "CA" },
  "92145": { placeName: "Miramar", state: "CA" },
  "92147": { placeName: "Miramar", state: "CA" },
  "92154": { placeName: "Otay Mesa", state: "CA" },
  "92155": { placeName: "Otay Mesa", state: "CA" },
  "92173": { placeName: "San Ysidro", state: "CA" },
  "92182": { placeName: "College Area", state: "CA" },
  "90012": { placeName: "Downtown Los Angeles", state: "CA" },
  "90210": { placeName: "Beverly Hills", state: "CA" },
  "92614": { placeName: "Irvine", state: "CA" },
  "10001": { placeName: "Chelsea", state: "NY" },
  "94102": { placeName: "Civic Center", state: "CA" },
  "33139": { placeName: "South Beach", state: "FL" },
  "60601": { placeName: "The Loop", state: "IL" },
  "78701": { placeName: "Downtown Austin", state: "TX" },
  "98101": { placeName: "Downtown Seattle", state: "WA" },
};

export const UNKNOWN_ZIP_AREA_LABEL = "Unknown Area";

export function lookupLocalZipPlace(zip: string): ZipPlaceRecord | null {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return null;
  return ZIP_PLACE_NAMES[normalized] ?? null;
}
