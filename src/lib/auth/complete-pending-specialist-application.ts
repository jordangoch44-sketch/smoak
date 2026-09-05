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
 * After specialist login, recover an interrupted last-step Submit.
 * In-progress wizard drafts stay local — do not submit from email verify.
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

  /* Only recover an interrupted Submit — in-progress wizard drafts stay local. */
  if (!pendingMatches) {
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
