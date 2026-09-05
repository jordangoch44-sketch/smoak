import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  fetchSpecialistApplicationByEmail,
  fetchSpecialistApplicationByUserId,
} from "@/lib/applications/specialist-applications-db";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  saveSpecialistApplication,
} from "@/lib/specialist-application-storage";
import type { SpecialistApplication } from "@/types/specialist-application";

export type EnsureSpecialistApplicationResult = {
  application: SpecialistApplication | null;
  created: boolean;
  message?: string;
};

/**
 * Loads an existing specialist application for a signed-in specialist.
 * Does not submit onboarding drafts — those stay local until the wizard's
 * last step. Interrupted submits recover via
 * `completePendingSpecialistApplicationAfterAuth`.
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

  return { application: null, created: false };
}
