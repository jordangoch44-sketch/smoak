import { sendSpecialistApplicationConfirmationEmail } from "@/lib/email/confirmation-email-service";
import { clearPendingMarketplaceSignup } from "@/lib/auth/pending-marketplace-signup";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import {
  fetchSpecialistApplicationByEmail,
  fetchSpecialistApplicationByUserId,
} from "@/lib/applications/specialist-applications-db";
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
  saveSpecialistApplication,
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

const submitInFlightByKey = new Map<
  string,
  Promise<SubmitSpecialistApplicationResult>
>();

function submitDedupeKey(email: string, userId: string | null): string {
  return `${userId || ""}|${email.trim().toLowerCase()}`;
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
  const key = submitDedupeKey(trimmedEmail, userId);
  const existingFlight = submitInFlightByKey.get(key);
  if (existingFlight) return existingFlight;

  const flight = submitSpecialistApplicationOnce(state, {
    userId,
    trimmedEmail,
  }).finally(() => {
    if (submitInFlightByKey.get(key) === flight) {
      submitInFlightByKey.delete(key);
    }
  });
  submitInFlightByKey.set(key, flight);
  return flight;
}

async function submitSpecialistApplicationOnce(
  state: SpecialistOnboardingState,
  resolved: { userId: string | null; trimmedEmail: string }
): Promise<SubmitSpecialistApplicationResult> {
  const { trimmedEmail, userId } = resolved;

  if (isMarketplaceSupabaseActive() && !userId) {
    throw new ApplicationSubmitError(
      "Your account session expired before submit. Sign in and try again."
    );
  }

  assertCanSubmitSpecialistApplication(trimmedEmail, userId);

  const now = new Date().toISOString();
  let existingByUser = userId
    ? findSpecialistApplicationByUserId(userId)
    : null;
  let existingByEmail = findSpecialistApplicationByEmail(trimmedEmail);

  /* Remote-first when local cache is empty (pre-hydrate / multi-device). */
  if (isMarketplaceSupabaseActive() && (!existingByUser || !existingByEmail)) {
    const supabase = getMarketplaceAuthClient();
    if (supabase) {
      if (!existingByUser && userId) {
        const remoteUser = await fetchSpecialistApplicationByUserId(
          supabase,
          userId
        );
        if (remoteUser.ok && remoteUser.application) {
          saveSpecialistApplication(remoteUser.application);
          existingByUser = remoteUser.application;
        }
      }
      if (!existingByEmail) {
        const remoteEmail = await fetchSpecialistApplicationByEmail(
          supabase,
          trimmedEmail
        );
        if (remoteEmail.ok && remoteEmail.application) {
          saveSpecialistApplication(remoteEmail.application);
          existingByEmail = remoteEmail.application;
        }
      }
    }
  }

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
    certifications: state.certifications.filter((cert) => cert.name.trim()),
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

  /* Saved copy — inline photos may have been moved to storage URLs. */
  const saved = result.application;

  const photoUrl = saved.media.profilePhotoUrl.trim();
  if (photoUrl) {
    await updateOwnProfileAvatarUrl(photoUrl);
  }

  syncProfileOverridesFromApplication(saved);
  hideTrainerId(id);
  clearSpecialistOnboardingDraft();
  clearPendingMarketplaceSignup();

  const emailResult = await sendSpecialistApplicationConfirmationEmail(saved);
  if (!emailResult.success) {
    console.warn(
      "[SMOAC EMAIL] Specialist confirmation email did not send successfully"
    );
  }

  return {
    application: saved,
    emailSent: emailResult.success,
    emailMode: emailResult.mode ?? null,
  };
}
