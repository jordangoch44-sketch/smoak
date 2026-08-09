import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  fetchSpecialistApplicationByEmail,
  fetchSpecialistApplicationByUserId,
} from "@/lib/applications/specialist-applications-db";
import { submitSpecialistApplication } from "@/lib/specialist-application-submit";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  loadSpecialistOnboardingDraft,
  saveSpecialistApplication,
} from "@/lib/specialist-application-storage";
import type {
  SpecialistApplication,
  SpecialistOnboardingState,
} from "@/types/specialist-application";

export type EnsureSpecialistApplicationResult = {
  application: SpecialistApplication | null;
  created: boolean;
  message?: string;
};

/**
 * Loads an existing specialist application for a signed-in specialist.
 * Only recovers a mid-submit draft when one matches this email — never invents
 * an empty PENDING row that would stall admin go-live.
 */
export async function ensurePendingSpecialistApplicationForAuthUser(input: {
  userId: string;
  email: string;
  firstName?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<EnsureSpecialistApplicationResult> {
  const userId = input.userId.trim();
  const email = input.email.trim().toLowerCase();
  if (!userId || !email) {
    return { application: null, created: false, message: "Missing account identity." };
  }

  const local =
    findSpecialistApplicationByUserId(userId) ??
    findSpecialistApplicationByEmail(email);
  if (local) {
    return { application: local, created: false };
  }

  if (isMarketplaceSupabaseActive()) {
    const supabase = getMarketplaceAuthClient();
    if (supabase) {
      const byUser = await fetchSpecialistApplicationByUserId(supabase, userId);
      if (byUser.ok && byUser.application) {
        saveSpecialistApplication(byUser.application);
        return { application: byUser.application, created: false };
      }
      const byEmail = await fetchSpecialistApplicationByEmail(supabase, email);
      if (byEmail.ok && byEmail.application) {
        saveSpecialistApplication(byEmail.application);
        return { application: byEmail.application, created: false };
      }
    }
  }

  const draft = loadSpecialistOnboardingDraft();
  const draftMatches =
    Boolean(draft) && draft!.email.trim().toLowerCase() === email;

  if (!draftMatches) {
    return {
      application: null,
      created: false,
      message: "No specialist application found for this account.",
    };
  }

  const state: SpecialistOnboardingState = { ...draft!, email, password: "" };

  try {
    const result = await submitSpecialistApplication(state, { userId });
    return { application: result.application, created: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create application.";
    return { application: null, created: false, message };
  }
}
