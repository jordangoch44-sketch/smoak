import { getApprovedSpecialistProfileById } from "@/lib/approved-specialist-profiles-store";
import { getTrainerById } from "@/data/trainers";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import type { Trainer } from "@/types";

function publicPhotoUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.toLowerCase().startsWith("data:")) return "";
  return trimmed;
}

function photoFromTrainer(trainer: Trainer | undefined): string {
  if (!trainer) return "";
  return (
    publicPhotoUrl(trainer.image) ||
    publicPhotoUrl(trainer.heroImage) ||
    publicPhotoUrl(trainer.galleryImages?.[0])
  );
}

/** Public listing photo for a specialist — empty string falls back to initials. */
export function resolveSpecialistListingAvatar(specialistId: string): string {
  const id = specialistId.trim();
  if (!id) return "";
  return (
    photoFromTrainer(getApprovedSpecialistProfileById(id)) ||
    photoFromTrainer(getTrainerById(id)) ||
    photoFromTrainer(
      listPublicMarketplaceTrainers({ includeBrowserState: true }).find(
        (trainer) => trainer.id === id
      )
    )
  );
}
