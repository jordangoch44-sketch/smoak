import {
  applicationToProfileOverrides,
  applicationToTrainer,
} from "@/lib/application-to-trainer";
import { getDevDashboardTrainerSeed } from "@/data/demo/dev-dashboard-trainer";
import { getTrainerById as getSeedTrainerById } from "@/data/trainers";
import { DEV_SPECIALIST_DASHBOARD_ID } from "@/constants/specialist-dashboard-mock";
import {
  getApprovedSpecialistProfileById,
  saveApprovedSpecialistProfileAsync,
} from "@/lib/approved-specialist-profiles-store";
import {
  DEV_FREE_SPECIALIST_CREDENTIALS,
  DEV_SPECIALIST_CREDENTIALS,
} from "@/lib/dev-auth";
import {
  findSpecialistApplicationByEmail,
  findSpecialistApplicationByUserId,
  getSpecialistApplicationById,
  saveSpecialistApplicationAsync,
} from "@/lib/specialist-application-storage";
import { updateOwnProfileAvatarUrl } from "@/lib/profiles/update-profile-avatar";
import {
  applySpecialistProfileOverrides,
  formToOverrides,
  loadSpecialistOverridesForId,
} from "@/lib/specialist-profile-overrides";
import { saveTrainerProfileOverrides } from "@/lib/specialist-profile-store";
import type { ProfileCompletionChecklistItem } from "@/types/specialist-dashboard";
import type {
  ProfileStatus,
  SpecialistApplication,
} from "@/types/specialist-application";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";
import type { Trainer } from "@/types/trainer";

export type ManagedProfileSaveResult =
  | { ok: true; source: string }
  | { ok: false; error: string };

export function describeManagedProfileSource(
  trainerId: string | null,
  application: SpecialistApplication | null
): string {
  if (!trainerId) return "none";
  if (application) {
    return `specialist-application (${application.profileStatus.toLowerCase()}) + profile-overrides`;
  }
  if (trainerId === DEV_SPECIALIST_DASHBOARD_ID) return "dev-dashboard + profile-overrides";
  return "profile-overrides";
}

export type ManagedProfileStatusLabel =
  | "Draft"
  | "Incomplete"
  | "Pending review"
  | "Published"
  | "Needs changes"
  | "Suspended";

export function profileStatusToLabel(
  status: ProfileStatus | null | undefined
): ManagedProfileStatusLabel | null {
  if (!status) return null;
  if (status === "DRAFT") return "Draft";
  if (status === "ARCHIVED") return "Suspended";
  if (status === "APPROVED") return "Published";
  if (status === "REJECTED") return "Needs changes";
  return "Pending review";
}

/** Resolve the specialist profile id for the signed-in session. */
export function resolveManagedSpecialistId(
  sessionEmail?: string,
  sessionUserId?: string
): string | null {
  if (sessionUserId?.trim()) {
    const byUser = findSpecialistApplicationByUserId(sessionUserId.trim());
    if (byUser) return byUser.id;
  }

  const trimmed = sessionEmail?.trim();
  if (!trimmed) return null;

  const application = findSpecialistApplicationByEmail(trimmed);
  if (application) return application.id;

  const normalized = trimmed.toLowerCase();
  if (normalized === DEV_SPECIALIST_CREDENTIALS.email.toLowerCase()) {
    return DEV_SPECIALIST_DASHBOARD_ID;
  }
  if (
    DEV_FREE_SPECIALIST_CREDENTIALS.id &&
    normalized === DEV_FREE_SPECIALIST_CREDENTIALS.email.toLowerCase()
  ) {
    return DEV_FREE_SPECIALIST_CREDENTIALS.id;
  }

  return null;
}

/** Trainer base for dashboard — includes pending applications (not public catalog). */
export function getManagedTrainerBaseById(trainerId: string): Trainer | undefined {
  const application = getSpecialistApplicationById(trainerId);
  if (application) return applicationToTrainer(application);

  const approved = getApprovedSpecialistProfileById(trainerId);
  if (approved) return approved;

  if (trainerId === DEV_SPECIALIST_DASHBOARD_ID) {
    return getDevDashboardTrainerSeed();
  }

  return getSeedTrainerById(trainerId);
}

export function syncProfileOverridesFromApplication(
  app: SpecialistApplication
): void {
  const existing = loadSpecialistOverridesForId(app.id);
  const generated = applicationToProfileOverrides(app);
  saveTrainerProfileOverrides(app.id, {
    ...generated,
    coverImageUrl: existing?.coverImageUrl ?? generated.coverImageUrl,
  });
}

/** Await specialist_profiles upsert + refresh approved catalog from remote. */
export async function syncApprovedProfileFromApplicationAsync(
  app: SpecialistApplication,
  overridesExplicit?: SpecialistProfileOverrides | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (app.profileStatus !== "APPROVED") return { ok: true };
  const base = applicationToTrainer(app);
  const overrides =
    overridesExplicit ?? loadSpecialistOverridesForId(app.id);
  return saveApprovedSpecialistProfileAsync(
    overrides ? applySpecialistProfileOverrides(base, overrides) : base,
    overrides
  );
}

export async function syncApplicationProfileDraftAsync(
  app: SpecialistApplication
): Promise<{ ok: true } | { ok: false; message: string }> {
  syncProfileOverridesFromApplication(app);
  return syncApprovedProfileFromApplicationAsync(app);
}

export function mergeProfileEditsIntoApplication(
  app: SpecialistApplication,
  form: SpecialistProfileEditForm
): SpecialistApplication {
  return {
    ...app,
    displayName: form.name.trim(),
    fullName: form.name.trim(),
    headline: form.title.trim(),
    gender: form.gender,
    professionalType: form.profession.trim(),
    specialties: form.specialty,
    certifications: form.certifications.filter((cert) => cert.name.trim()),
    city: form.city.trim(),
    neighborhood: form.neighborhood.trim(),
    zipCode: form.zipCode.trim() || app.zipCode,
    serviceType: form.serviceType || app.serviceType || "",
    travelRadius: form.travelRadius.trim() || app.travelRadius,
    phone: form.phone.trim(),
    email: form.email.trim() || app.email,
    bio: form.bio.trim(),
    yearsExperience: form.experienceYears.trim(),
    coachingPhilosophy: form.trainingStyle.trim(),
    bestClientTypes: form.servicesOffered.trim(),
    serviceAreaDescription:
      form.serviceArea.length > 0
        ? form.serviceArea.join(", ")
        : app.serviceAreaDescription,
    pricing: {
      ...app.pricing,
      oneOnOnePrice:
        form.pricePerSession > 0
          ? String(form.pricePerSession)
          : app.pricing.oneOnOnePrice,
    },
    social: {
      ...app.social,
      instagram: form.instagram.trim() || undefined,
      website: form.website.trim() || undefined,
      tiktok: form.tiktok.trim() || undefined,
    },
    media: {
      ...app.media,
      profilePhotoUrl: form.profilePhotoUrl.trim() || app.media.profilePhotoUrl,
      transformationPhotoUrls: form.transformationNotes.trim(),
      /* Legacy field name — stores header/gallery image URLs (not only videos). */
      trainingVideoUrls: form.photoNotes.trim(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function saveManagedSpecialistProfileEdits(
  trainerId: string,
  form: SpecialistProfileEditForm
): Promise<ManagedProfileSaveResult> {
  const source = describeManagedProfileSource(
    trainerId,
    getSpecialistApplicationById(trainerId)
  );

  if (typeof window === "undefined") {
    return { ok: false, error: "Unable to save changes" };
  }

  if (
    form.profilePhotoUrl.trim().startsWith("blob:") ||
    form.coverImageUrl.trim().startsWith("blob:")
  ) {
    return {
      ok: false,
      error: "Unable to save changes",
    };
  }

  try {
    const application = getSpecialistApplicationById(trainerId);
    const overrides = formToOverrides(form);

    if (application) {
      const updated = mergeProfileEditsIntoApplication(application, form);
      const saveResult = await saveSpecialistApplicationAsync(updated);
      if (!saveResult.ok) {
        return {
          ok: false,
          error: saveResult.message || "Unable to save changes",
        };
      }

      /* Persist overrides before approved sync so remote upsert uses fresh data. */
      saveTrainerProfileOverrides(trainerId, overrides);

      const saved = saveResult.application;
      if (saved.profileStatus === "APPROVED") {
        const remote = await syncApprovedProfileFromApplicationAsync(
          saved,
          overrides
        );
        if (!remote.ok) {
          return { ok: false, error: remote.message || "Unable to save changes" };
        }
      }
    } else {
      saveTrainerProfileOverrides(trainerId, overrides);
    }

    const photoUrl = form.profilePhotoUrl.trim();
    if (photoUrl && !photoUrl.startsWith("blob:")) {
      void updateOwnProfileAvatarUrl(photoUrl);
    }

    return { ok: true, source };
  } catch (error) {
    console.error("[SMOAC PROFILE SAVE]", error);
    return { ok: false, error: "Unable to save changes" };
  }
}

export function buildProfileCompletionChecklist(
  form: SpecialistProfileEditForm,
  trainer?: Trainer
): ProfileCompletionChecklistItem[] {
  return [
    {
      id: "photo",
      label: form.profilePhotoUrl.trim() ? "Professional photo" : "Add profile photo",
      done: Boolean(form.profilePhotoUrl.trim()),
    },
    {
      id: "bio",
      label: form.bio.trim() ? "Bio" : "Add bio",
      done: Boolean(form.bio.trim()),
    },
    {
      id: "philosophy",
      label: form.trainingStyle.trim()
        ? "Coaching philosophy"
        : "Add coaching philosophy",
      done: Boolean(form.trainingStyle.trim()),
    },
    {
      id: "transformations",
      label: form.transformationNotes.trim()
        ? "Client transformations"
        : "Add client transformations",
      done: Boolean(form.transformationNotes.trim()),
    },
    {
      id: "reviews",
      label: (trainer?.reviews?.length ?? 0) > 0 ? "Reviews" : "Add reviews",
      done: (trainer?.reviews?.length ?? 0) > 0,
    },
    {
      id: "booking",
      label: form.bookingAvailability.trim()
        ? "Booking availability"
        : "Add booking link",
      done: Boolean(form.bookingAvailability.trim()),
    },
    {
      id: "specialties",
      label: form.specialty.length > 0 ? "Specialties" : "Add specialties",
      done: form.specialty.length > 0,
    },
  ];
}

/** Demo dashboard metrics only — never when a real application exists for the session. */
export function isDemoSpecialistDashboard(
  trainerId: string | null,
  sessionEmail?: string
): boolean {
  if (sessionEmail?.trim() && findSpecialistApplicationByEmail(sessionEmail)) {
    return false;
  }
  return (
    trainerId === DEV_SPECIALIST_DASHBOARD_ID ||
    trainerId === null
  );
}
