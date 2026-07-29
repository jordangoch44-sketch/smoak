import { getAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import type { Trainer } from "@/types";

/**
 * Homepage Sponsored / paid placement boost.
 * Pro membership alone does NOT grant sponsored placement.
 */
export function isTrainerSponsored(trainer: Trainer): boolean {
  if (trainer.sponsored === true) return true;
  const meta = getAdminSpecialistMeta(trainer.id);
  return meta.sponsored === true;
}

/** Vetted / high-trust organic specialists sort ahead of non-verified at equal distance */
export function isTrainerVerified(trainer: Trainer): boolean {
  if (trainer.verified) return true;
  return trainer.reviewCount >= 60 && trainer.rating >= 4.7;
}
