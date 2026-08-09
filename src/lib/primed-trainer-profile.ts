import type { Trainer } from "@/types/trainer";

/**
 * Soft-nav handoff — Marketplace already has the trainer on the card.
 * Priming lets the intercept sheet mount with real card data immediately
 * (no RSC wait / empty flash) while the route catches up.
 */

let primed: { id: string; trainer: Trainer } | null = null;

export function primeTrainerProfile(trainer: Trainer): void {
  primed = { id: trainer.id, trainer };
}

export function peekPrimedTrainer(trainerId: string): Trainer | null {
  if (!primed || primed.id !== trainerId) return null;
  return primed.trainer;
}

export function clearPrimedTrainer(trainerId?: string): void {
  if (!primed) return;
  if (trainerId && primed.id !== trainerId) return;
  primed = null;
}
