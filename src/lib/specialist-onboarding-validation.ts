import { isListedGender } from "@/lib/gender";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { isValidEmail } from "@/lib/validation/email";
import {
  parseSessionPrice,
} from "@/lib/session-price";
import type { SpecialistOnboardingState } from "@/types/specialist-application";

interface OnboardingMissingField {
  step: number;
  label: string;
}

export type SpecialistOnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface MissingFieldOptions {
  /** Auth account already exists — password is not required to continue. */
  skipPassword?: boolean;
}

function missingForStep(
  step: number,
  state: SpecialistOnboardingState,
  options?: MissingFieldOptions
): string[] {
  const missing: string[] = [];

  switch (step) {
    case 1:
      if (!state.professionalType.length) {
        missing.push("Professional type");
      }
      break;
    case 2:
      if (!state.fullName.trim()) missing.push("Full name");
      if (!isListedGender(state.gender)) missing.push("Gender");
      if (!state.displayName.trim()) missing.push("Business name");
      if (!state.headline.trim()) missing.push("Professional title");
      if (!isValidEmail(state.email)) missing.push("Valid email");
      if (!options?.skipPassword && state.password.trim().length < 8) {
        missing.push("Password (8+ characters)");
      }
      if (!state.phone.trim()) missing.push("Phone number");
      if (!state.media.profilePhotoUrl.trim()) missing.push("Profile photo");
      break;
    case 3: {
      if (!state.serviceType) missing.push("Service type");
      if (state.serviceType === "virtual") break;
      const zip = normalizeZipCode(state.zipCode);
      if (!isValidZipCode(zip)) missing.push("Primary ZIP code");
      break;
    }
    case 4:
      if (state.specialties.length === 0) missing.push("Specialties");
      break;
    case 5: {
      if (state.bio.trim().length < 40) {
        missing.push("Short bio (about 40+ characters)");
      }
      {
        const min = parseSessionPrice(state.pricing?.oneOnOnePriceMin);
        const max = parseSessionPrice(state.pricing?.oneOnOnePriceMax);
        if (min <= 0 || max <= 0) {
          missing.push("Session price range (e.g. $80–$120)");
        }
      }
      if (state.trainingOptions.length === 0) {
        missing.push("Training options");
      }
      break;
    }
    default:
      break;
  }

  return missing;
}

/** Required fields missing before final specialist submit (short path). */
export function getSpecialistOnboardingMissingFields(
  state: SpecialistOnboardingState,
  options?: MissingFieldOptions
): OnboardingMissingField[] {
  const results: OnboardingMissingField[] = [];

  for (let step = 1; step <= 5; step += 1) {
    for (const label of missingForStep(step, state, options)) {
      results.push({ step, label });
    }
  }

  return results;
}

/** Auth credentials required to create an account — cannot submit without these. */
export function getSpecialistOnboardingAuthGaps(
  state: SpecialistOnboardingState,
  options?: MissingFieldOptions
): OnboardingMissingField[] {
  const gaps: OnboardingMissingField[] = [];
  if (!isValidEmail(state.email)) {
    gaps.push({ step: 2, label: "Valid email" });
  }
  if (!options?.skipPassword && state.password.trim().length < 8) {
    gaps.push({ step: 2, label: "Password (8+ characters)" });
  }
  return gaps;
}

function asOnboardingStep(value: number): SpecialistOnboardingStep | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }
  return null;
}

/** First incomplete questionnaire step, or review (6) when required fields are filled. */
export function getSpecialistOnboardingResumeStep(
  state: SpecialistOnboardingState,
  options?: MissingFieldOptions & { savedStep?: number | null }
): SpecialistOnboardingStep {
  let inferred: SpecialistOnboardingStep = 6;
  for (let step = 1; step <= 5; step += 1) {
    if (missingForStep(step, state, options).length > 0) {
      inferred = step as SpecialistOnboardingStep;
      break;
    }
  }

  const saved = asOnboardingStep(options?.savedStep ?? 0);
  if (!saved) return inferred;
  return saved < inferred ? saved : inferred;
}
