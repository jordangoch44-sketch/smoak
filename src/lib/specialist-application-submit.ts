import { sendSpecialistApplicationConfirmationEmail } from "@/lib/email/confirmation-email-service";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
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
import { assertCanSubmitSpecialistApplication } from "@/lib/specialist-application-validation";
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

/** Persist specialist application for admin review (Supabase when configured). */
export async function submitSpecialistApplication(
  state: SpecialistOnboardingState
): Promise<SpecialistApplication> {
  const trimmedEmail = state.email.trim();
  const session = getAuthSessionSnapshot();
  assertCanSubmitSpecialistApplication(trimmedEmail, session?.userId);

  const now = new Date().toISOString();
  const existingByUser = session?.userId
    ? findSpecialistApplicationByUserId(session.userId)
    : null;
  const existingByEmail = findSpecialistApplicationByEmail(trimmedEmail);
  const existing = existingByUser ?? existingByEmail;

  /* Reuse id for draft/rejected resubmits — never create a second profile row */
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
    userId: session?.userId ?? existing?.userId ?? null,
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
    throw new Error(result.message);
  }

  const photoUrl = application.media.profilePhotoUrl.trim();
  if (photoUrl) {
    void updateOwnProfileAvatarUrl(photoUrl);
  }

  syncProfileOverridesFromApplication(application);
  hideTrainerId(id);
  clearSpecialistOnboardingDraft();

  void sendSpecialistApplicationConfirmationEmail(application).then(
    (emailResult) => {
      if (!emailResult.success) {
        console.warn(
          "[SMOAC EMAIL] Specialist confirmation email did not send successfully"
        );
      }
    }
  );

  return application;
}
