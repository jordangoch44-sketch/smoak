import type { Trainer } from "@/types/trainer";
import {
  parseTrainingOptions,
  SPECIALIST_TRAINING_OPTIONS,
  type SpecialistTrainingOptionId,
} from "@/types/specialist-training-options";

export type ProfileSpecialtyIconId =
  | "flame"
  | "dumbbell"
  | "bolt"
  | "run"
  | "hex"
  | "apple"
  | "yoga"
  | "glove"
  | "medical"
  | "trophy";

export type TrainingOptionKind = SpecialistTrainingOptionId;

export interface TrainingOptionCard {
  id: string;
  kind: TrainingOptionKind;
  title: string;
  description: string;
}

export function specialtyIconId(label: string): ProfileSpecialtyIconId {
  const value = label.trim().toLowerCase();
  if (/fat|weight loss|cut/.test(value)) return "flame";
  if (/muscle|hypertrophy|gain/.test(value)) return "dumbbell";
  if (/strength|powerlift|force/.test(value)) return "bolt";
  if (/hyrox/.test(value)) return "trophy";
  if (/athletic|sport|performance|run/.test(value)) return "run";
  if (/functional|mobility/.test(value)) return "hex";
  if (/nutrition|diet|meal/.test(value)) return "apple";
  if (/yoga|pilates|mind/.test(value)) return "yoga";
  if (/box|fight|mma|kick/.test(value)) return "glove";
  if (/recover|corrective|physio|rehab/.test(value)) return "medical";
  if (/senior|women|health/.test(value)) return "trophy";
  return "dumbbell";
}

export function trainingOptionCardsFromTrainer(
  trainer: Trainer
): TrainingOptionCard[] {
  const selected = parseTrainingOptions(trainer.trainingOptions, {
    sessionExperience: trainer.sessionExperience,
  });
  return SPECIALIST_TRAINING_OPTIONS.filter((option) =>
    selected.includes(option.id)
  ).map((option) => ({
    id: option.id,
    kind: option.id,
    title: option.label,
    description: option.description,
  }));
}

export function credentialInitials(name: string, issuer: string): string {
  const source = issuer.trim() || name.trim();
  if (source.length > 0 && source.length <= 4) return source.toUpperCase();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 3).toUpperCase() || "C";
}

export function trainerTextureUrls(trainer: Trainer): string[] {
  const urls = [trainer.heroImage, ...(trainer.galleryImages ?? [])]
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter(Boolean);
  return [...new Set(urls)];
}
