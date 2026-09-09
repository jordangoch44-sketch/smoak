import { trainers as seedTrainers } from "@/data/trainers";
import { getApprovedSpecialistProfilesSnapshot } from "@/lib/approved-specialist-profiles-store";
import { listSpecialistApplications } from "@/lib/specialist-application-storage";
import {
  allocateUniqueSpecialistSlug,
  isValidSpecialistSlug,
} from "@/lib/trainer-profile-path";
import type { SpecialistApplication } from "@/types/specialist-application";

function listingName(application: SpecialistApplication): string {
  return (
    application.displayName.trim() ||
    application.businessName.trim() ||
    application.fullName.trim() ||
    "specialist"
  );
}

/** Public path keys already claimed by other specialists (ids + slugs). */
export function collectTakenSpecialistSlugs(excludeId?: string): Set<string> {
  const taken = new Set<string>();
  const skip = excludeId?.trim() ?? "";

  const claim = (value: string | null | undefined, ownerId?: string) => {
    const key = value?.trim().toLowerCase() ?? "";
    if (!key) return;
    if (skip && ownerId === skip) return;
    taken.add(key);
  };

  for (const trainer of seedTrainers) {
    claim(trainer.id, trainer.id);
    claim(trainer.slug, trainer.id);
  }

  for (const trainer of Object.values(getApprovedSpecialistProfilesSnapshot())) {
    claim(trainer.id, trainer.id);
    claim(trainer.slug, trainer.id);
  }

  for (const application of listSpecialistApplications()) {
    claim(application.id, application.id);
    claim(application.slug, application.id);
  }

  return taken;
}

/** Freeze a unique business-name slug on first assignment; keep it after that. */
export function ensureUniqueApplicationSlug(
  application: SpecialistApplication
): SpecialistApplication {
  const existing = application.slug?.trim().toLowerCase() ?? "";
  const taken = collectTakenSpecialistSlugs(application.id);
  if (existing && isValidSpecialistSlug(existing) && !taken.has(existing)) {
    if (application.slug === existing) return application;
    return { ...application, slug: existing };
  }

  const slug = allocateUniqueSpecialistSlug({
    name: listingName(application),
    city: application.city,
    taken,
    preferred: existing,
  });

  if (application.slug === slug) return application;
  return { ...application, slug };
}
