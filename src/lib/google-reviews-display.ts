import type { SocialLinks, Trainer } from "@/types/trainer";
import type { GooglePlaceSnapshot } from "@/lib/google-places";

/** Cached Google reputation stored on trainer.social (optional — old profiles omit). */
export function applyGooglePlaceSnapshotToSocial(
  social: SocialLinks | undefined,
  snapshot: GooglePlaceSnapshot
): SocialLinks {
  return {
    ...(social ?? {}),
    googlePlaceId: snapshot.placeId,
    googleReviewsUrl: snapshot.mapsUrl,
    googleRating: snapshot.rating ?? undefined,
    googleReviewCount: snapshot.reviewCount,
    googleFetchedAt: snapshot.fetchedAt,
  };
}

/** Keep a connected Google listing when a later save omits Place ID fields. */
export function overlayGoogleSocialIfMissing(
  incoming: SocialLinks | undefined,
  existing: SocialLinks | undefined
): SocialLinks {
  const next = incoming ?? {};
  if (next.googlePlaceId?.trim()) {
    return { ...(existing ?? {}), ...next };
  }
  if (!existing?.googlePlaceId?.trim()) return next;
  return {
    ...next,
    googlePlaceId: existing.googlePlaceId,
    googleReviewsUrl: existing.googleReviewsUrl,
    googleRating: existing.googleRating,
    googleReviewCount: existing.googleReviewCount,
    googleFetchedAt: existing.googleFetchedAt,
  };
}

export function googleBusinessProfileHref(input: {
  mapsUrl?: string | null;
  placeId?: string | null;
}): string | null {
  const mapsUrl = input.mapsUrl?.trim() ?? "";
  const placeId = input.placeId?.trim() ?? "";
  if (mapsUrl) {
    return /^https?:\/\//i.test(mapsUrl) ? mapsUrl : `https://${mapsUrl}`;
  }
  if (placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  }
  return null;
}

export function readGooglePlaceSnapshotFromTrainer(
  trainer: Trainer | null | undefined
): {
  connected: boolean;
  placeId: string;
  mapsUrl: string;
  rating: number | null;
  reviewCount: number;
  fetchedAt: string;
} {
  const social = trainer?.social;
  const placeId = social?.googlePlaceId?.trim() ?? "";
  const mapsUrl = social?.googleReviewsUrl?.trim() ?? "";
  const reviewCount =
    typeof social?.googleReviewCount === "number" &&
    Number.isFinite(social.googleReviewCount)
      ? Math.max(0, Math.floor(social.googleReviewCount))
      : 0;
  const rating =
    typeof social?.googleRating === "number" &&
    Number.isFinite(social.googleRating)
      ? social.googleRating
      : null;
  const fetchedAt = social?.googleFetchedAt?.trim() ?? "";
  const connected = Boolean(placeId);

  return {
    connected,
    placeId,
    mapsUrl,
    rating: connected ? rating : null,
    reviewCount: connected ? reviewCount : 0,
    fetchedAt,
  };
}

/** Public hero: Free always locked; Pro shows live numbers when connected. */
export function resolvePublicGoogleReviewsDisplay(trainer: Trainer): {
  locked: boolean;
  connected: boolean;
  rating: number | null;
  reviewCount: number;
  mapsHref: string | null;
} {
  const isPro = Boolean(trainer.isPremium);
  const snap = readGooglePlaceSnapshotFromTrainer(trainer);
  const mapsHref = googleBusinessProfileHref({
    mapsUrl: snap.mapsUrl,
    placeId: snap.placeId,
  });

  if (!isPro) {
    return {
      locked: true,
      connected: false,
      rating: null,
      reviewCount: 0,
      mapsHref: null,
    };
  }

  return {
    locked: false,
    connected: snap.connected,
    rating: snap.connected ? snap.rating : null,
    reviewCount: snap.connected ? snap.reviewCount : 0,
    mapsHref: snap.connected ? mapsHref : null,
  };
}
