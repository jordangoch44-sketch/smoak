/**
 * Marketplace media caps for specialist public profiles.
 * Free: header slideshow images only. Pro: more images + short videos.
 */
export const SPECIALIST_MEDIA_LIMITS = {
  free: { images: 4, videos: 0 },
  premium: { images: 8, videos: 2 },
} as const;

export type SpecialistMediaPlan = keyof typeof SPECIALIST_MEDIA_LIMITS;

export function specialistMediaLimitsForPlan(isPremium: boolean) {
  return isPremium
    ? SPECIALIST_MEDIA_LIMITS.premium
    : SPECIALIST_MEDIA_LIMITS.free;
}

export function parseMediaUrlList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function serializeMediaUrlList(urls: string[]): string {
  return urls.map((url) => url.trim()).filter(Boolean).join("\n");
}

/** Move `url` to the front — first header image is the cover clients see first. */
export function promoteMediaUrl(urls: string[], url: string): string[] {
  const trimmed = url.trim();
  if (!trimmed) return urls;
  return [trimmed, ...urls.filter((item) => item !== trimmed)];
}

/** Max Instagram-style pins under the public profile hero (Pro / trial only). */
export const PINNED_PHOTOS_MAX = 3;

/** Pro Plus — client transformations carousel under pinned photos. */
export const CLIENT_TRANSFORMATIONS_MAX = 8;

export function normalizeTransformationUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const cleaned: string[] = [];
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || cleaned.includes(trimmed)) continue;
    cleaned.push(trimmed);
    if (cleaned.length >= CLIENT_TRANSFORMATIONS_MAX) break;
  }
  return cleaned;
}

/** Keep up to 3 unique image URLs, optionally restricted to an allow-list. */
export function normalizePinnedPhotos(
  urls: unknown,
  allowed?: readonly string[]
): string[] {
  if (!Array.isArray(urls)) return [];
  const cleaned: string[] = [];
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || cleaned.includes(trimmed)) continue;
    if (allowed && !allowed.includes(trimmed)) continue;
    cleaned.push(trimmed);
    if (cleaned.length >= PINNED_PHOTOS_MAX) break;
  }
  return cleaned;
}
