import type { Certification } from "@/types/trainer";
import type { SpecialistOnboardingState } from "@/types/specialist-application";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function hasCertificationEntry(certs: Certification[]): boolean {
  return certs.some(
    (cert) =>
      cert.name.trim().length > 0 &&
      cert.issuer.trim().length > 0 &&
      cert.year > 0
  );
}

export function isSpecialistOnboardingStepValid(
  step: number,
  state: SpecialistOnboardingState
): boolean {
  switch (step) {
    case 1:
      return state.professionalType.length > 0;
    case 2:
      return (
        state.fullName.trim().length > 0 &&
        state.displayName.trim().length > 0 &&
        state.headline.trim().length > 0 &&
        isValidEmail(state.email) &&
        state.password.trim().length >= 6 &&
        state.phone.trim().length > 0 &&
        state.gender !== "" &&
        state.yearsExperience.trim().length > 0 &&
        state.ageRangesWorkedWith.length > 0
      );
    case 3:
      return (
        state.city.trim().length > 0 &&
        state.zipCode.trim().length > 0 &&
        (state.inHomeAvailable ||
          state.onlineCoachingAvailable ||
          state.gymName.trim().length > 0)
      );
    case 4:
      return state.specialties.length > 0;
    case 5:
      return hasCertificationEntry(state.certifications);
    case 6:
      return (
        state.coachingPhilosophy.trim().length > 20 &&
        state.bestClientTypes.trim().length > 0 &&
        state.coachingDifferentiator.trim().length > 0 &&
        state.communicationStyle.trim().length > 0 &&
        state.motivationStyle.length > 0
      );
    case 7:
      return (
        state.pricing.oneOnOnePrice.trim().length > 0 &&
        state.pricing.sessionDuration.length > 0
      );
    case 8:
      return (
        state.availability.daysAvailable.length > 0 &&
        state.availability.timeBlocks.length > 0 &&
        state.availability.clientCapacity.trim().length > 0
      );
    case 9:
      return Boolean(
        state.social.instagram?.trim() ||
          state.social.website?.trim() ||
          state.media.profilePhotoUrl.trim()
      );
    case 10:
      return state.bio.trim().length >= 80;
    case 11:
      return isSpecialistOnboardingStepValid(1, state) &&
        isSpecialistOnboardingStepValid(2, state) &&
        isSpecialistOnboardingStepValid(3, state) &&
        isSpecialistOnboardingStepValid(4, state) &&
        isSpecialistOnboardingStepValid(5, state) &&
        isSpecialistOnboardingStepValid(6, state) &&
        isSpecialistOnboardingStepValid(7, state) &&
        isSpecialistOnboardingStepValid(8, state) &&
        isSpecialistOnboardingStepValid(9, state) &&
        isSpecialistOnboardingStepValid(10, state);
    case 12:
      return true;
    default:
      return false;
  }
}
