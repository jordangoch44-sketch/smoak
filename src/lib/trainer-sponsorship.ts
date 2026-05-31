import { getAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import type { Trainer } from "@/types";

/** Marketplace sponsored placement (ads / featured buy-up) */
export function isTrainerSponsored(trainer: Trainer): boolean {
  if (trainer.sponsored) return true;
  const meta = getAdminSpecialistMeta(trainer.id);
  if (meta.featured === true || meta.isPremium === true) return true;
  return trainer.featured;
}

/** Vetted / high-trust organic specialists sort ahead of non-verified at equal distance */
export function isTrainerVerified(trainer: Trainer): boolean {
  if (trainer.verified) return true;
  return trainer.reviewCount >= 60 && trainer.rating >= 4.7;
}
