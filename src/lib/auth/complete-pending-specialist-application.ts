import {
  clearPendingMarketplaceSignup,
  readPendingMarketplaceSignup,
} from "@/lib/auth/pending-marketplace-signup";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  loadSpecialistOnboardingDraft,
} from "@/lib/specialist-application-storage";
import { findSpecialistApplicationByEmail } from "@/lib/specialist-application-storage";

/**
 * After email confirm + specialist login, submit the onboarding draft once
 * if signup was interrupted before application persistence.
 */
export async function completePendingSpecialistApplicationAfterAuth(
  email: string
): Promise<{ submitted: boolean; message?: string }> {
  const normalized = email.trim().toLowerCase();
  const pending = readPendingMarketplaceSignup();
  const draft = loadSpecialistOnboardingDraft();
  const draftMatches =
    Boolean(draft) && draft!.email.trim().toLowerCase() === normalized;

  const pendingMatches =
    Boolean(pending) &&
    pending!.email === normalized &&
    pending!.role === "specialist" &&
    Boolean(pending!.submitSpecialistApplication);

  /* Recover when the user tried multiple emails: draft for this login still counts. */
  if (!pendingMatches && !draftMatches) {
    return { submitted: false };
  }

  const existing = findSpecialistApplicationByEmail(normalized);
  if (
    existing &&
    (existing.profileStatus === "PENDING_APPROVAL" ||
      existing.profileStatus === "APPROVED")
  ) {
    clearPendingMarketplaceSignup();
    return { submitted: false };
  }

  if (!draftMatches || !draft) {
    clearPendingMarketplaceSignup();
    return {
      submitted: false,
      message: "Your application draft was missing. Complete onboarding again.",
    };
  }

  try {
    await submitSpecialistApplication(draft);
    clearPendingMarketplaceSignup();
    return { submitted: true };
  } catch (error) {
    return {
      submitted: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not submit your specialist application.",
    };
  }
}
