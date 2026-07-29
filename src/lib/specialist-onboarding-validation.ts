import type { Certification } from "@/types/trainer";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { isValidEmail } from "@/lib/validation/email";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { isSpecialistTravelRadius } from "@/types/specialist-service-area";

export interface OnboardingMissingField {
  step: number;
  label: string;
}

function hasCertificationEntry(certs: Certification[]): boolean {
  return certs.some((cert) => cert.name.trim().length > 0);
}

function missingForStep(step: number, state: SpecialistOnboardingState): string[] {
  const missing: string[] = [];

  switch (step) {
    case 1:
      if (!state.professionalType.length) {
        missing.push("Professional type");
      }
      break;
    case 2:
      if (!state.fullName.trim()) missing.push("Full name");
      if (!state.displayName.trim()) missing.push("Display / business name");
      if (!state.headline.trim()) missing.push("Headline");
      if (!isValidEmail(state.email)) missing.push("Valid email");
      if (state.password.trim().length < 8) missing.push("Password (8+ characters)");
      if (!state.phone.trim()) missing.push("Phone number");
      break;
    case 3: {
      const zip = normalizeZipCode(state.zipCode);
      if (!isValidZipCode(zip)) missing.push("Primary ZIP code");
      if (!state.serviceType) missing.push("Service type");
      if (!isSpecialistTravelRadius(state.travelRadius)) {
        missing.push("Travel radius");
      }
      break;
    }
    case 4:
      if (state.specialties.length === 0) missing.push("Specialties");
      break;
    case 5:
      if (state.bio.trim().length < 40) missing.push("Short bio (about 40+ characters)");
      if (
        !state.media.profilePhotoUrl.trim() &&
        !state.social.instagram?.trim() &&
        !state.social.website?.trim() &&
        !hasCertificationEntry(state.certifications)
      ) {
        missing.push("Photo, Instagram, website, or a certification");
      }
      break;
    default:
      break;
  }

  return missing;
}

/** Recommended fields missing before final specialist submit (short path). */
export function getSpecialistOnboardingMissingFields(
  state: SpecialistOnboardingState
): OnboardingMissingField[] {
  const results: OnboardingMissingField[] = [];

  for (let step = 1; step <= 5; step += 1) {
    for (const label of missingForStep(step, state)) {
      results.push({ step, label });
    }
  }

  return results;
}

/** Auth credentials required to create an account — cannot submit without these. */
export function getSpecialistOnboardingAuthGaps(
  state: SpecialistOnboardingState
): OnboardingMissingField[] {
  const gaps: OnboardingMissingField[] = [];
  if (!isValidEmail(state.email)) {
    gaps.push({ step: 2, label: "Valid email" });
  }
  if (state.password.trim().length < 8) {
    gaps.push({ step: 2, label: "Password (8+ characters)" });
  }
  return gaps;
}

/** Profile fields that may be submitted incomplete (excludes login credentials). */
export function getSpecialistOnboardingOptionalMissingFields(
  state: SpecialistOnboardingState
): OnboardingMissingField[] {
  return getSpecialistOnboardingMissingFields(state).filter(
    (field) =>
      field.label !== "Valid email" &&
      !field.label.startsWith("Password")
  );
}

/** @deprecated Per-step gating removed — use getSpecialistOnboardingMissingFields at submit */
export function isSpecialistOnboardingStepValid(
  step: number,
  state: SpecialistOnboardingState
): boolean {
  if (step === 6) {
    return getSpecialistOnboardingMissingFields(state).length === 0;
  }
  return missingForStep(step, state).length === 0;
}
