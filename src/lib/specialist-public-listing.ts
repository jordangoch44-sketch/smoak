import {
  PINNED_PHOTOS_MAX,
  normalizePinnedPhotos,
} from "@/lib/specialist-media-limits";
import { isMonetizationEnabled } from "@/lib/monetization";
import type { Trainer, TrainerIntroVideo } from "@/types/trainer";

function orderedPublicImageUrls(trainer: Trainer): string[] {
  if (trainer.galleryImages?.length) {
    return trainer.galleryImages.map((url) => url.trim()).filter(Boolean);
  }
  return (Array.isArray(trainer.gallery) ? trainer.gallery : [])
    .filter((item) => item.type === "image")
    .map((item) => item.src.trim())
    .filter(Boolean);
}

/**
 * Public listing. Profile media stays visible.
 * While SMOAC is not selling placement, paid rails and sort pins are cleared.
 */
export function applyPublicMembershipVisibility(trainer: Trainer): Trainer {
  if (!isMonetizationEnabled()) {
    return {
      ...trainer,
      sponsored: false,
      featured: false,
      categorySpotlight: false,
      topRanked: false,
    };
  }
  return trainer;
}

/** Owner Live tab — intro clip saved on the listing. */
export function resolveOwnerLiveLockedIntro(
  trainer: Trainer
): TrainerIntroVideo | undefined {
  return trainer.introVideo?.src?.trim() ? trainer.introVideo : undefined;
}

/** Owner Live tab — saved pins, or the first gallery photos if none are pinned. */
export function resolveOwnerLiveLockedPins(trainer: Trainer): string[] {
  const galleryUrls = orderedPublicImageUrls(trainer);
  const savedPins = normalizePinnedPhotos(trainer.pinnedPhotos, galleryUrls);
  if (savedPins.length > 0) return savedPins;
  return galleryUrls.slice(0, PINNED_PHOTOS_MAX);
}
