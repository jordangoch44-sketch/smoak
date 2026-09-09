import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { safeExploreMapImageSrc } from "@/lib/explore-map-popup";
import { primeTrainerProfile } from "@/lib/primed-trainer-profile";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";

/** Decode the marketplace photo so the sheet/card can paint from cache. */
export function preloadTrainerPhoto(url: string | undefined | null): void {
  const src = safeExploreMapImageSrc(url);
  if (!src || typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
}

/** Prime sheet data + prefetch route as early as pointer-down (before click). */
export function warmTrainerProfileNavigation(
  trainer: Trainer,
  router?: Pick<AppRouterInstance, "prefetch"> | null,
  options?: { prefetch?: boolean }
): void {
  primeTrainerProfile(trainer);
  preloadTrainerPhoto(trainer.image);
  if (!router || options?.prefetch === false) return;
  try {
    router.prefetch(trainerProfilePath(trainer));
  } catch {
    /* prefetch is best-effort */
  }
}

/** Start sheet handoff as soon as a map pin is pressed — before the card paints. */
export function warmExploreMapCluster(
  cluster: { trainers: Trainer[] },
  router?: Pick<AppRouterInstance, "prefetch"> | null
): void {
  const visible = cluster.trainers.slice(0, 3);
  visible.forEach((trainer, index) => {
    warmTrainerProfileNavigation(trainer, router, { prefetch: index < 2 });
  });
}
