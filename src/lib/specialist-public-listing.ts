import { trainerOffersFreeFirstSession } from "@/lib/free-first-session";
import {
  PINNED_PHOTOS_MAX,
  normalizePinnedPhotos,
  specialistMediaLimitsForPlan,
} from "@/lib/specialist-media-limits";
import {
  isProPlusPlan,
  parseMembershipPlan,
} from "@/lib/specialist-premium";
import type { Trainer, TrainerIntroVideo, TrainerMediaItem } from "@/types/trainer";

function orderedPublicImageUrls(trainer: Trainer): string[] {
  if (trainer.galleryImages?.length) {
    return trainer.galleryImages.map((url) => url.trim()).filter(Boolean);
  }
  return (Array.isArray(trainer.gallery) ? trainer.gallery : [])
    .filter((item) => item.type === "image")
    .map((item) => item.src.trim())
    .filter(Boolean);
}

function orderedPublicVideos(trainer: Trainer): TrainerMediaItem[] {
  return (Array.isArray(trainer.gallery) ? trainer.gallery : []).filter(
    (item) => item.type === "video" && item.src.trim()
  );
}

/**
 * Marketplace view of a listing. Stored Pro extras stay in specialist_profiles;
 * this only hides them from clients until the specialist restores a paid plan.
 */
export function applyPublicMembershipVisibility(trainer: Trainer): Trainer {
  const plan = parseMembershipPlan(trainer.membershipPlan);
  const isPremium =
    trainer.isPremium === true || plan === "premium" || plan === "platinum";
  const isProPlus = isProPlusPlan(plan);
  const limits = specialistMediaLimitsForPlan(isPremium, isProPlus);

  const liveImageUrls = orderedPublicImageUrls(trainer).slice(0, limits.images);
  const liveImageSet = new Set(liveImageUrls);
  const liveVideos = isProPlus
    ? orderedPublicVideos(trainer).slice(0, limits.videos)
    : [];
  const liveVideoSet = new Set(liveVideos.map((item) => item.src));

  const gallery = (Array.isArray(trainer.gallery) ? trainer.gallery : []).filter(
    (item) => {
      if (item.type === "video") return liveVideoSet.has(item.src);
      if (item.type === "image") {
        return liveImageSet.size > 0
          ? liveImageSet.has(item.src)
          : liveImageUrls.includes(item.src);
      }
      return false;
    }
  );

  const heroImage =
    (trainer.heroImage && liveImageSet.has(trainer.heroImage)
      ? trainer.heroImage
      : liveImageUrls[0]) || trainer.heroImage;

  return {
    ...trainer,
    gallery,
    galleryImages: liveImageUrls,
    heroImage,
    pinnedPhotos: isPremium ? trainer.pinnedPhotos : [],
    clientTransformations: isProPlus ? trainer.clientTransformations : [],
    introVideo: isPremium ? trainer.introVideo : undefined,
    offersFreeFirstSession:
      isPremium && trainerOffersFreeFirstSession(trainer),
  };
}

/**
 * Owner Live tab only — Free specialists still see the intro clip they
 * would have on Pro. Marketplace keeps it stripped via
 * `applyPublicMembershipVisibility`.
 */
export function resolveOwnerLiveLockedIntro(
  trainer: Trainer
): TrainerIntroVideo | undefined {
  return trainer.introVideo?.src?.trim() ? trainer.introVideo : undefined;
}

/**
 * Owner Live tab only — Free specialists still see the pin row they would
 * have on Pro (saved pins, or gallery photos if they never pinned).
 * Marketplace keeps pins stripped via `applyPublicMembershipVisibility`.
 */
export function resolveOwnerLiveLockedPins(trainer: Trainer): string[] {
  const galleryUrls = orderedPublicImageUrls(trainer);
  const savedPins = normalizePinnedPhotos(trainer.pinnedPhotos, galleryUrls);
  if (savedPins.length > 0) return savedPins;
  return galleryUrls.slice(0, PINNED_PHOTOS_MAX);
}
