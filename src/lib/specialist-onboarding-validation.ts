import type { Certification } from "@/types/trainer";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { isValidGoogleReviewsUrl } from "@/lib/google-reviews-url";
import { isValidEmail } from "@/lib/validation/email";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { isSpecialistTravelRadius } from "@/types/specialist-service-area";

export interface OnboardingMissingField {
  step: number;
  label: string;
}

function hasCertificationEntry(certs: Certification[]): boolean {
  return certs.some(
    (cert) =>
      cert.name.trim().length > 0 &&
      cert.issuer.trim().length > 0 &&
      cert.year > 0
  );
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
      if (state.password.trim().length < 6) missing.push("Password (6+ characters)");
      if (!state.phone.trim()) missing.push("Phone number");
      if (!state.gender) missing.push("Gender");
      if (!state.yearsExperience.trim()) missing.push("Years of experience");
      if (state.ageRangesWorkedWith.length === 0) {
        missing.push("Age ranges you work with");
      }
      break;
    case 3: {
      const zip = normalizeZipCode(state.zipCode);
      if (!isValidZipCode(zip)) missing.push("Primary ZIP code");
      if (!state.city.trim()) missing.push("City");
      if (state.state.trim().length < 2) missing.push("State");
      if (!state.serviceType) missing.push("Service type");
      if (!isSpecialistTravelRadius(state.travelRadius)) {
        missing.push("Travel radius");
      }
      if (
        !state.inHomeAvailable &&
        !state.onlineCoachingAvailable &&
        !state.gymName.trim()
      ) {
        missing.push("Session format (in-home, online, or gym)");
      }
      break;
    }
    case 4:
      if (state.specialties.length === 0) missing.push("Specialties");
      break;
    case 5:
      if (!hasCertificationEntry(state.certifications)) {
        missing.push("At least one certification");
      }
      break;
    case 6:
      if (state.coachingPhilosophy.trim().length <= 20) {
        missing.push("Coaching philosophy");
      }
      if (!state.bestClientTypes.trim()) missing.push("Best client types");
      if (!state.coachingDifferentiator.trim()) {
        missing.push("What makes you different");
      }
      if (!state.communicationStyle.trim()) {
        missing.push("Communication style");
      }
      if (!state.motivationStyle.trim()) missing.push("Motivation style");
      break;
    case 7:
      if (!state.pricing.oneOnOnePrice.trim()) {
        missing.push("1-on-1 session price");
      }
      if (!state.pricing.sessionDuration) missing.push("Session duration");
      break;
    case 8:
      if (state.availability.daysAvailable.length === 0) {
        missing.push("Days available");
      }
      if (state.availability.timeBlocks.length === 0) {
        missing.push("Time blocks");
      }
      if (!state.availability.clientCapacity.trim()) {
        missing.push("Client capacity");
      }
      break;
    case 9:
      if (
        !state.social.instagram?.trim() &&
        !state.social.website?.trim() &&
        !state.media.profilePhotoUrl.trim()
      ) {
        missing.push("Profile photo, Instagram, or website");
      }
      if (
        state.social.googleReviewsUrl?.trim() &&
        !isValidGoogleReviewsUrl(state.social.googleReviewsUrl)
      ) {
        missing.push("Valid Google Reviews / Maps link");
      }
      break;
    case 10:
      if (state.bio.trim().length < 80) missing.push("Bio (about 80+ characters)");
      break;
    default:
      break;
  }

  return missing;
}

/** Recommended / important fields missing before final specialist submit */
export function getSpecialistOnboardingMissingFields(
  state: SpecialistOnboardingState
): OnboardingMissingField[] {
  const results: OnboardingMissingField[] = [];

  for (let step = 1; step <= 10; step += 1) {
    for (const label of missingForStep(step, state)) {
      results.push({ step, label });
    }
  }

  return results;
}

/** @deprecated Per-step gating removed — use getSpecialistOnboardingMissingFields at submit */
export function isSpecialistOnboardingStepValid(
  step: number,
  state: SpecialistOnboardingState
): boolean {
  if (step === 11) {
    return getSpecialistOnboardingMissingFields(state).length === 0;
  }
  if (step === 12) return true;
  return missingForStep(step, state).length === 0;
}
