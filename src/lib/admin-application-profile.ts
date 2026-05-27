import type { SpecialistApplication } from "@/types/specialist-application";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";

function parsePrice(value: string): number {
  const digits = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function buildSessionExperience(app: SpecialistApplication): string[] {
  const items: string[] = [];
  if (app.inHomeAvailable) items.push("In-home sessions");
  if (app.onlineCoachingAvailable) items.push("Online coaching");
  if (app.gymName.trim()) items.push(`Training at ${app.gymName.trim()}`);
  items.push(...app.availability.daysAvailable);
  items.push(...app.availability.timeBlocks);
  if (app.pricing.groupTrainingAvailable) items.push("Small group training");
  if (app.pricing.freeConsultationAvailable) items.push("Free consultation");
  return [...new Set(items)];
}

/** Map approved application → specialist profile override draft (Supabase-ready shape) */
export function applicationToProfileOverrides(
  app: SpecialistApplication
): SpecialistProfileOverrides {
  const pricePerSession = parsePrice(app.pricing.oneOnOnePrice);

  return {
    name: app.displayName.trim() || app.fullName.trim(),
    title: app.headline.trim(),
    gender: app.gender || "non-binary",
    profession: app.professionalType,
    specialty: app.specialties,
    certifications: app.certifications,
    city: app.city.trim(),
    neighborhood: app.neighborhood.trim(),
    serviceArea: app.neighborhood.trim() ? [app.neighborhood.trim()] : [],
    pricePerSession: pricePerSession || 100,
    bio: app.bio.trim(),
    bookingAvailability: buildSessionExperience(app).join(", "),
  };
}
