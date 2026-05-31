import { sendSpecialistApplicationConfirmationEmail } from "@/lib/email/confirmation-email-service";
import { hideTrainerId } from "@/lib/hidden-trainers-store";
import { syncProfileOverridesFromApplication } from "@/lib/managed-specialist-profile";
import { enrichSpecialistApplicationFields } from "@/lib/specialist-application-fields";
import {
  clearSpecialistOnboardingDraft,
  saveSpecialistApplication,
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

/** DEV ONLY — persist application for admin review and specialist dashboard draft */
export function submitSpecialistApplication(
  state: SpecialistOnboardingState
): SpecialistApplication {
  const trimmedEmail = state.email.trim();
  assertCanSubmitSpecialistApplication(trimmedEmail);

  const now = new Date().toISOString();
  const id = slugifyId(trimmedEmail);
  const enriched = enrichSpecialistApplicationFields(state);

  const application: SpecialistApplication = {
    id,
    profileStatus: "PENDING_APPROVAL",
    submittedAt: now,
    updatedAt: now,
    ...enriched,
    email: trimmedEmail,
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

  saveSpecialistApplication(application);
  syncProfileOverridesFromApplication(application);
  hideTrainerId(id);
  clearSpecialistOnboardingDraft();

  void sendSpecialistApplicationConfirmationEmail(application).then((result) => {
    if (!result.success) {
      console.warn(
        "[SMOAC EMAIL] Specialist confirmation email did not send successfully"
      );
    }
  });

  return application;
}
