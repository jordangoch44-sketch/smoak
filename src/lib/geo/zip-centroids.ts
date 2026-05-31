import { normalizeZipCode, isValidZipCode } from "@/lib/zip-to-marketplace-city";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * San Diego County + common marketplace ZIP centroids for proximity sorting.
 * Sources: USPS / census approximations for demo geocoding.
 */
const ZIP_CENTROIDS: Record<string, GeoCoordinates> = {
  "92008": { latitude: 33.1581, longitude: -117.3506 },
  "92024": { latitude: 33.037, longitude: -117.292 },
  "92037": { latitude: 32.8473, longitude: -117.274 },
  "92101": { latitude: 32.7157, longitude: -117.1611 },
  "92102": { latitude: 32.7159, longitude: -117.1262 },
  "92103": { latitude: 32.7487, longitude: -117.1685 },
  "92104": { latitude: 32.7484, longitude: -117.1295 },
  "92105": { latitude: 32.5839, longitude: -117.0891 },
  "92106": { latitude: 32.7221, longitude: -117.2297 },
  "92107": { latitude: 32.7446, longitude: -117.2531 },
  "92108": { latitude: 32.7719, longitude: -117.154 },
  "92109": { latitude: 32.7914, longitude: -117.2414 },
  "92110": { latitude: 32.7513, longitude: -117.2085 },
  "92111": { latitude: 32.807, longitude: -117.1669 },
  "92113": { latitude: 32.6773, longitude: -117.0972 },
  "92114": { latitude: 32.7066, longitude: -117.0509 },
  "92115": { latitude: 32.7595, longitude: -117.07 },
  "92116": { latitude: 32.7641, longitude: -117.1227 },
  "92117": { latitude: 32.8233, longitude: -117.2052 },
  "92118": { latitude: 32.6759, longitude: -117.177 },
  "92119": { latitude: 32.8074, longitude: -117.0139 },
  "92120": { latitude: 32.7959, longitude: -117.0716 },
  "92121": { latitude: 32.895, longitude: -117.195 },
  "92122": { latitude: 32.8561, longitude: -117.2103 },
  "92123": { latitude: 32.7323, longitude: -117.1381 },
  "92124": { latitude: 32.821, longitude: -117.0766 },
  "92126": { latitude: 32.9098, longitude: -117.1386 },
  "92127": { latitude: 33.0214, longitude: -117.0964 },
  "92128": { latitude: 33.0364, longitude: -117.0528 },
  "92129": { latitude: 32.9595, longitude: -117.0583 },
  "92130": { latitude: 32.9479, longitude: -117.2226 },
  "92131": { latitude: 32.8998, longitude: -117.0815 },
  "92132": { latitude: 32.7157, longitude: -117.1611 },
  "92134": { latitude: 32.7157, longitude: -117.1611 },
  "92135": { latitude: 32.6769, longitude: -117.1103 },
  "92136": { latitude: 32.6769, longitude: -117.1103 },
  "92139": { latitude: 32.6762, longitude: -117.0524 },
  "92140": { latitude: 32.7317, longitude: -117.1972 },
  "92145": { latitude: 32.8723, longitude: -117.1426 },
  "92147": { latitude: 32.8723, longitude: -117.1426 },
  "92154": { latitude: 32.5839, longitude: -117.0891 },
  "92155": { latitude: 32.5839, longitude: -117.0891 },
  "92173": { latitude: 32.5839, longitude: -117.0891 },
  "92182": { latitude: 32.7743, longitude: -117.0717 },
  "91910": { latitude: 32.6401, longitude: -117.0842 },
  "91911": { latitude: 32.6073, longitude: -117.0489 },
  "92054": { latitude: 33.1959, longitude: -117.3795 },
  "92025": { latitude: 33.1192, longitude: -117.0864 },
  "90210": { latitude: 34.103, longitude: -118.4105 },
  "90012": { latitude: 34.0522, longitude: -118.2437 },
  "92614": { latitude: 33.7175, longitude: -117.8311 },
  "10001": { latitude: 40.7506, longitude: -73.9971 },
  "94102": { latitude: 37.7793, longitude: -122.4193 },
  "33139": { latitude: 25.7823, longitude: -80.1347 },
  "60601": { latitude: 41.8853, longitude: -87.6217 },
  "78701": { latitude: 30.2711, longitude: -97.7437 },
  "98101": { latitude: 47.6114, longitude: -122.3345 },
};

/** Local database lookup only — no external geocode */
export function lookupLocalZipCoordinates(zip: string): GeoCoordinates | null {
  const digits = normalizeZipCode(zip);
  if (!isValidZipCode(digits)) return null;
  return ZIP_CENTROIDS[digits] ?? null;
}

/**
 * Sync resolve from local table (saved geocode coords live in storage).
 * For unknown ZIPs use {@link resolveZipLocation} (async).
 */
export function zipCodeToCoordinates(zip: string): GeoCoordinates | null {
  return lookupLocalZipCoordinates(zip);
}
