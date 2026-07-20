import { sendSpecialistApplicationConfirmationEmail } from "@/lib/email/confirmation-email-service";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { hideTrainerId } from "@/lib/hidden-trainers-store";
import { syncProfileOverridesFromApplication } from "@/lib/managed-specialist-profile";
import { updateOwnProfileAvatarUrl } from "@/lib/profiles/update-profile-avatar";
import { enrichSpecialistApplicationFields } from "@/lib/specialist-application-fields";
import {
  clearSpecialistOnboardingDraft,
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  saveSpecialistApplicationAsync,
} from "@/lib/specialist-application-storage";
import {
  ApplicationSubmitError,
  assertCanSubmitSpecialistApplication,
} from "@/lib/specialist-application-validation";
import type {
  SpecialistApplication,
  SpecialistOnboardingState,
} from "@/types/specialist-application";

function slugifyId(email: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "specialist"}-${Date.now().toString(36)}`;
}

/** Prefer auth store, then live Supabase user — required for RLS user_id = auth.uid(). */
async function resolveSubmitUserId(
  preferredUserId?: string | null
): Promise<string | null> {
  const preferred = preferredUserId?.trim();
  if (preferred) return preferred;

  const fromStore = getAuthSessionSnapshot()?.userId?.trim();
  if (fromStore) return fromStore;

  if (!isMarketplaceSupabaseActive()) return null;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id?.trim() || null;
}

export type SubmitSpecialistApplicationResult = {
  application: SpecialistApplication;
  emailSent: boolean;
  emailMode: "resend" | "console" | null;
};

/** Persist specialist application for admin review (Supabase when configured). */
export async function submitSpecialistApplication(
  state: SpecialistOnboardingState,
  options?: { userId?: string | null }
): Promise<SubmitSpecialistApplicationResult> {
  const trimmedEmail = state.email.trim();
  const userId = await resolveSubmitUserId(options?.userId);

  if (isMarketplaceSupabaseActive() && !userId) {
    throw new ApplicationSubmitError(
      "Your account session expired before submit. Sign in and try again."
    );
  }

  assertCanSubmitSpecialistApplication(trimmedEmail, userId);

  const now = new Date().toISOString();
  const existingByUser = userId
    ? findSpecialistApplicationByUserId(userId)
    : null;
  const existingByEmail = findSpecialistApplicationByEmail(trimmedEmail);
  const existing = existingByUser ?? existingByEmail;

  /* Reuse id for draft/rejected/pending updates — never create a second profile row */
  const id = existing?.id ?? slugifyId(trimmedEmail);
  const enriched = enrichSpecialistApplicationFields(state);

  const application: SpecialistApplication = {
    id,
    profileStatus: "PENDING_APPROVAL",
    submittedAt: existing?.submittedAt ?? now,
    updatedAt: now,
    ...enriched,
    email: trimmedEmail,
    password: "",
    userId: userId ?? existing?.userId ?? null,
    certifications: state.certifications.filter(
      (cert) => cert.name.trim() && cert.issuer.trim()
    ),
    media: {
      ...enriched.media,
      profilePhotoUrl: enriched.media.profilePhotoUrl.trim(),
      profilePhotoOriginalUrl: "",
      profilePhotoCrop: null,
    },
  };

  const result = await saveSpecialistApplicationAsync(application);
  if (!result.ok) {
    throw new ApplicationSubmitError(
      result.message ||
        "Could not save your application. Check your connection and try again."
    );
  }

  const photoUrl = application.media.profilePhotoUrl.trim();
  if (photoUrl) {
    void updateOwnProfileAvatarUrl(photoUrl);
  }

  syncProfileOverridesFromApplication(application);
  hideTrainerId(id);
  clearSpecialistOnboardingDraft();

  const emailResult = await sendSpecialistApplicationConfirmationEmail(
    application
  );
  if (!emailResult.success) {
    console.warn(
      "[SMOAC EMAIL] Specialist confirmation email did not send successfully"
    );
  }

  return {
    application,
    emailSent: emailResult.success,
    emailMode: emailResult.mode ?? null,
  };
}
