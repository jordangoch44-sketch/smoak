import type { Trainer } from "@/types";
import type {
  SpecialistProfileEditForm,
  SpecialistProfileOverrides,
} from "@/types/specialist-profile-edit";
import { DEMO_SPECIALIST_ID } from "@/data/dashboard-mock";

/** DEV ONLY — persisted specialist profile edits */
export const DEV_SPECIALIST_PROFILE_OVERRIDES_KEY =
  "smoac_specialist_profile_overrides";

function syncLocation(trainer: Trainer): Trainer {
  const neighborhood = trainer.neighborhood.trim();
  const city = trainer.city.trim();
  return {
    ...trainer,
    location: neighborhood ? `${neighborhood}, ${city}` : city,
  };
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function applySpecialistProfileOverrides(
  base: Trainer,
  overrides: SpecialistProfileOverrides | null | undefined
): Trainer {
  if (!overrides) return base;

  const merged: Trainer = {
    ...base,
    ...overrides,
    specialty: overrides.specialty ?? base.specialty,
    serviceArea: overrides.serviceArea ?? base.serviceArea,
    certifications: overrides.certifications ?? base.certifications,
  };

  if (overrides.bookingAvailability?.trim()) {
    const slots = parseCommaList(overrides.bookingAvailability);
    if (slots.length > 0) {
      merged.sessionExperience = slots;
    }
  }

  if (overrides.photoNotes?.trim()) {
    const photoUrls = parseLineList(overrides.photoNotes).filter(isUrl);
    if (photoUrls.length > 0) {
      merged.gallery = photoUrls.map((src, index) => ({
        id: `profile-photo-${index}`,
        type: "image" as const,
        src,
        alt: `${merged.name} gallery photo ${index + 1}`,
      }));
    }
  }

  if (overrides.transformationNotes?.trim()) {
    const transformUrls = parseLineList(overrides.transformationNotes).filter(isUrl);
    if (transformUrls.length > 0) {
      merged.clientTransformations = transformUrls.map((src, index) => ({
        id: `profile-transform-${index}`,
        src,
        alt: `Client transformation ${index + 1}`,
      }));
    }
  }

  return syncLocation(merged);
}

export function overridesFromTrainer(
  trainer: Trainer,
  stored?: SpecialistProfileOverrides | null
): SpecialistProfileEditForm {
  return {
    name: stored?.name ?? trainer.name,
    title: stored?.title ?? trainer.title,
    gender: stored?.gender ?? trainer.gender,
    profession: stored?.profession ?? trainer.profession,
    specialty: [...(stored?.specialty ?? trainer.specialty)],
    certifications: (stored?.certifications ?? trainer.certifications).map(
      (cert) => ({ ...cert })
    ),
    city: stored?.city ?? trainer.city,
    neighborhood: stored?.neighborhood ?? trainer.neighborhood,
    serviceArea: [...(stored?.serviceArea ?? trainer.serviceArea)],
    pricePerSession: stored?.pricePerSession ?? trainer.pricePerSession,
    bio: stored?.bio ?? trainer.bio,
    photoNotes: stored?.photoNotes ?? "",
    transformationNotes: stored?.transformationNotes ?? "",
    bookingAvailability:
      stored?.bookingAvailability ??
      trainer.sessionExperience.slice(0, 3).join(", "),
  };
}

export function formToOverrides(form: SpecialistProfileEditForm): SpecialistProfileOverrides {
  return {
    name: form.name.trim(),
    title: form.title.trim(),
    gender: form.gender,
    profession: form.profession.trim(),
    specialty: form.specialty.map((s) => s.trim()).filter(Boolean),
    certifications: form.certifications.filter((c) => c.name.trim()),
    city: form.city.trim(),
    neighborhood: form.neighborhood.trim(),
    serviceArea: form.serviceArea.map((s) => s.trim()).filter(Boolean),
    pricePerSession: form.pricePerSession,
    bio: form.bio.trim(),
    photoNotes: form.photoNotes.trim(),
    transformationNotes: form.transformationNotes.trim(),
    bookingAvailability: form.bookingAvailability.trim(),
  };
}

export function computeProfileCompletion(
  form: SpecialistProfileEditForm
): number {
  const checks = [
    Boolean(form.name.trim()),
    Boolean(form.title.trim()),
    Boolean(form.profession.trim()),
    form.specialty.length > 0,
    form.certifications.some((c) => c.name.trim()),
    Boolean(form.city.trim()),
    Boolean(form.neighborhood.trim()),
    form.serviceArea.length > 0,
    form.pricePerSession > 0,
    Boolean(form.bio.trim()),
    Boolean(form.photoNotes.trim()),
    Boolean(form.transformationNotes.trim()),
    Boolean(form.bookingAvailability.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function loadAllSpecialistOverrides(): Record<
  string,
  SpecialistProfileOverrides
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEV_SPECIALIST_PROFILE_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SpecialistProfileOverrides>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function persistAllSpecialistOverrides(
  map: Record<string, SpecialistProfileOverrides>
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DEV_SPECIALIST_PROFILE_OVERRIDES_KEY,
    JSON.stringify(map)
  );
}

export function loadSpecialistOverridesForId(
  trainerId: string
): SpecialistProfileOverrides | null {
  return loadAllSpecialistOverrides()[trainerId] ?? null;
}

export function saveSpecialistOverridesForId(
  trainerId: string,
  overrides: SpecialistProfileOverrides
): void {
  const map = loadAllSpecialistOverrides();
  map[trainerId] = overrides;
  persistAllSpecialistOverrides(map);
}

export function getManagedSpecialistId(sessionEmail?: string): string {
  void sessionEmail;
  return DEMO_SPECIALIST_ID;
}
