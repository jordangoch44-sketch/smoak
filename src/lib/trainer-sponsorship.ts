import { getAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import type { Trainer } from "@/types";

/**
 * Homepage Sponsored / paid placement boost.
 * Pro membership alone does NOT grant sponsored placement.
 * If nobody is paying, the homepage rail stays hidden.
 */
export function isTrainerSponsored(trainer: Trainer): boolean {
  if (trainer.sponsored === true) return true;
  const meta = getAdminSpecialistMeta(trainer.id);
  return meta.sponsored === true;
}

/** Preserve input order while splitting paid boosts from organic listings. */
export function partitionSponsoredTrainers(trainers: readonly Trainer[]): {
  sponsored: Trainer[];
  organic: Trainer[];
} {
  const sponsored: Trainer[] = [];
  const organic: Trainer[] = [];
  for (const trainer of trainers) {
    if (isTrainerSponsored(trainer)) sponsored.push(trainer);
    else organic.push(trainer);
  }
  return { sponsored, organic };
}

/**
 * Public “Verified” badge + organic sort boost.
 * Tied only to SMOAC Pro / paid entitlement (`isPremium`) — not approval,
 * review counts, or stored `verified` flags. Free → no badge; cancel Pro → badge off.
 */
export function isTrainerVerified(trainer: Trainer): boolean {
  return Boolean(trainer.isPremium);
}
