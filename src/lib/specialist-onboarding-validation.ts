import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { isValidEmail } from "@/lib/validation/email";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { isSpecialistTravelRadius } from "@/types/specialist-service-area";

interface OnboardingMissingField {
  step: number;
  label: string;
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
      if (!state.displayName.trim()) missing.push("Business name");
      if (!state.headline.trim()) missing.push("Headline");
      if (!isValidEmail(state.email)) missing.push("Valid email");
      if (state.password.trim().length < 8) missing.push("Password (8+ characters)");
      if (!state.phone.trim()) missing.push("Phone number");
      if (!state.media.profilePhotoUrl.trim()) missing.push("Profile photo");
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
    case 5: {
      if (state.bio.trim().length < 40) {
        missing.push("Short bio (about 40+ characters)");
      }
      const priceDigits = state.pricing.oneOnOnePrice.replace(/[^\d.]/g, "");
      const price = Number.parseFloat(priceDigits);
      if (!Number.isFinite(price) || price <= 0) {
        missing.push("Session price (e.g. $120)");
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
