import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { primeTrainerProfile } from "@/lib/primed-trainer-profile";
import type { Trainer } from "@/types/trainer";

/** Prime sheet data + prefetch route as early as pointer-down (before click). */
export function warmTrainerProfileNavigation(
  trainer: Trainer,
  router?: Pick<AppRouterInstance, "prefetch"> | null
): void {
  primeTrainerProfile(trainer);
  if (!router) return;
  try {
    router.prefetch(`/trainers/${trainer.id}`);
  } catch {
    /* prefetch is best-effort */
  }
}
