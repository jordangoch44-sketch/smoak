import { trainerMatchesPublicKey } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";

let primed: { id: string; trainer: Trainer } | null = null;

export function primeTrainerProfile(trainer: Trainer): void {
  primed = { id: trainer.id, trainer };
}

export function peekPrimedTrainer(publicKey: string): Trainer | null {
  if (!primed) return null;
  if (trainerMatchesPublicKey(primed.trainer, publicKey)) return primed.trainer;
  return null;
}

export function clearPrimedTrainer(publicKey?: string): void {
  if (!primed) return;
  if (publicKey && !trainerMatchesPublicKey(primed.trainer, publicKey)) return;
  primed = null;
}
