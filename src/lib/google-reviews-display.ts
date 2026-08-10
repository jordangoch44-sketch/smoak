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
  const mapsHref = snap.mapsUrl
    ? /^https?:\/\//i.test(snap.mapsUrl)
      ? snap.mapsUrl
      : `https://${snap.mapsUrl}`
    : snap.placeId
      ? `https://www.google.com/maps/place/?q=place_id:${snap.placeId}`
      : null;

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
