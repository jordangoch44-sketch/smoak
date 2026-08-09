import type { Trainer } from "@/types/trainer";

/**
 * Soft-nav handoff — Marketplace already has the trainer on the card.
 * Opening primes the id and mounts an instant sheet with real card data
 * while the intercept route catches up.
 */

export type OptimisticProfileSheetState = {
  trainer: Trainer;
  /** True after the slide-up finishes — real sheet may claim then. */
  enterReady: boolean;
};

let primed: { id: string; trainer: Trainer } | null = null;
let optimistic: OptimisticProfileSheetState | null = null;

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

export function getOptimisticProfileSheetSnapshot(): OptimisticProfileSheetState | null {
  return optimistic;
}

export function getOptimisticProfileSheetServerSnapshot(): null {
  return null;
}

export function peekOptimisticProfileSheet(): OptimisticProfileSheetState | null {
  return optimistic;
}

export function primeTrainerProfile(trainer: Trainer): void {
  primed = { id: trainer.id, trainer };
}

/** Instant sheet + prime — call from card tap. */
export function openOptimisticProfileSheet(trainer: Trainer): void {
  primed = { id: trainer.id, trainer };
  optimistic = { trainer, enterReady: false };
  notify();
}

export function markOptimisticProfileSheetEnterReady(trainerId: string): void {
  if (!optimistic || optimistic.trainer.id !== trainerId) return;
  if (optimistic.enterReady) return;
  optimistic = { ...optimistic, enterReady: true };
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
  /* Never rip the sheet mid-slide — wait until enter settles. */
  if (!optimistic.enterReady) return false;
  optimistic = null;
  notify();
  return true;
}

export function closeOptimisticProfileSheet(): void {
  if (!optimistic) return;
  optimistic = null;
  notify();
}
