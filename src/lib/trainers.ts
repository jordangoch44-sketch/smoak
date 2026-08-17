import type { Trainer, TrainerFilters } from "@/types";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { trainerMatchesGenderFilter } from "@/lib/gender";

export function trainerMatchesSpecialty(
  trainer: Trainer,
  specialty: string
): boolean {
  const target = specialty.trim().toLowerCase();
  if (!target) return true;
  if (trainer.specialty.some((s) => s.toLowerCase() === target)) return true;
  if (trainer.specialty.some((s) => s.toLowerCase().includes(target))) {
    return true;
  }
  return (
    trainer.title.toLowerCase().includes(target) ||
    trainer.profession.toLowerCase().includes(target)
  );
}

/** Applies sidebar filter fields (specialty, gender, price). */
export function filterTrainers(
  trainers: Trainer[],
  filters: TrainerFilters
): Trainer[] {
  return trainers.filter((trainer) => {
    if (
      filters.profession &&
      !trainerMatchesProfessionCategory(trainer, filters.profession)
    ) {
      return false;
    }
    if (
      filters.specialty &&
      !trainerMatchesSpecialty(trainer, filters.specialty)
    ) {
      return false;
    }
    if (filters.gender && !trainerMatchesGenderFilter(trainer.gender, filters.gender)) {
      return false;
    }
    if (filters.serviceType === "in-person") {
      const mode = trainer.serviceType ?? "both";
      if (mode !== "in-person" && mode !== "both") {
        return false;
      }
    }
    if (filters.serviceType === "virtual") {
      const mode = trainer.serviceType ?? "both";
      if (mode !== "virtual" && mode !== "both") {
        return false;
      }
    }
    if (filters.priceMin) {
      const min = parseInt(filters.priceMin, 10);
      if (Number.isFinite(min) && trainer.pricePerSession < min) {
        return false;
      }
    }
    if (filters.priceMax) {
      const max = parseInt(filters.priceMax, 10);
      if (Number.isFinite(max) && trainer.pricePerSession > max) {
        return false;
      }
    }
    return true;
  });
}
