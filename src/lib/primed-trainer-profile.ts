import type { Trainer } from "@/types/trainer";

/**
 * Soft-nav handoff — Marketplace already has the trainer on the card.
 * Opening primes the id and mounts an instant sheet with real card data
 * while the intercept route catches up.
 */

let primed: { id: string; trainer: Trainer } | null = null;
let optimistic: { trainer: Trainer } | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeOptimisticProfileSheet(
  onStoreChange: () => void
): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getOptimisticProfileSheetSnapshot(): {
  trainer: Trainer;
} | null {
  return optimistic;
}

export function getOptimisticProfileSheetServerSnapshot(): null {
  return null;
}

export function peekOptimisticProfileSheet(): { trainer: Trainer } | null {
  return optimistic;
}

export function primeTrainerProfile(trainer: Trainer): void {
  primed = { id: trainer.id, trainer };
}

/** Instant sheet + prime — call from card tap. */
export function openOptimisticProfileSheet(trainer: Trainer): void {
  primed = { id: trainer.id, trainer };
  optimistic = { trainer };
  notify();
}

export function peekPrimedTrainer(trainerId: string): Trainer | null {
  if (optimistic?.trainer.id === trainerId) return optimistic.trainer;
  if (!primed || primed.id !== trainerId) return null;
  return primed.trainer;
}

export function clearPrimedTrainer(trainerId?: string): void {
  if (!primed) return;
  if (trainerId && primed.id !== trainerId) return;
  primed = null;
}

/** Real intercept sheet takes over — hide optimistic without exit anim. */
export function claimOptimisticProfileSheet(trainerId: string): boolean {
  if (optimistic?.trainer.id !== trainerId) return false;
  optimistic = null;
  notify();
  return true;
}

export function closeOptimisticProfileSheet(): void {
  if (!optimistic) return;
  optimistic = null;
  notify();
}
