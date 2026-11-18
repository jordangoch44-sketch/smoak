/**
 * Marketplace media caps. Every specialist listing uses the full profile cap:
 * 8 header images and up to 5 phone videos, 45 seconds each.
 */
export const SPECIALIST_MEDIA_LIMITS = {
  free: { images: 4, videos: 0 },
  premium: { images: 8, videos: 0 },
  proPlus: { images: 8, videos: 5 },
} as const;

/** Max length for a PRO+ profile video. */
export const SPECIALIST_VIDEO_MAX_SECONDS = 45;

export function specialistVideoTooLongMessage(): string {
  return `Clips must be ${SPECIALIST_VIDEO_MAX_SECONDS} seconds or less.`;
}

/** Last-resort storage ceiling — not a 1080p vs 4K rule. */
export function specialistVideoTooLargeMessage(): string {
  return "This clip is too large to upload.";
}

export type SpecialistMediaPlan = keyof typeof SPECIALIST_MEDIA_LIMITS;

export function specialistMediaLimitsForPlan(
  _isPremium?: boolean,
  _isProPlus = false
) {
  return SPECIALIST_MEDIA_LIMITS.proPlus;
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

/** PRO+ — client results slider under Specialties in Details. */
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

/** Keep up to 3 unique media URLs, optionally restricted to an allow-list. */
export function pinAllowList(
  photoUrls: readonly string[] | undefined,
  videoUrls?: readonly string[] | undefined
): string[] {
  return [...(photoUrls ?? []), ...(videoUrls ?? [])]
    .map((url) => url.trim())
    .filter(Boolean);
}

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
