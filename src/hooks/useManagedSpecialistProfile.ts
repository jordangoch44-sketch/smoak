"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  applySpecialistProfileOverrides,
  computeProfileCompletion,
  overridesFromTrainer,
} from "@/lib/specialist-profile-overrides";
import {
  getManagedTrainerBaseById,
  resolveManagedSpecialistId,
  saveManagedSpecialistProfileEdits,
  type ManagedProfileSaveResult,
} from "@/lib/managed-specialist-profile";
import {
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  getApprovedSpecialistProfilesHydratedServerSnapshot,
  getApprovedSpecialistProfilesHydratedSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import {
  ensureSpecialistApplicationsHydrated,
  getSpecialistApplicationById,
  getSpecialistApplicationsHydratedServerSnapshot,
  getSpecialistApplicationsHydratedSnapshot,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  getSpecialistProfilesSnapshot,
  getSpecialistProfilesServerSnapshot,
  subscribeSpecialistProfiles,
} from "@/lib/specialist-profile-store";

function getApplicationRevision(
  sessionEmail?: string,
  sessionUserId?: string
): string {
  const trainerId = resolveManagedSpecialistId(sessionEmail, sessionUserId);
  if (!trainerId) return "";
  const application = getSpecialistApplicationById(trainerId);
  return application ? `${application.id}:${application.updatedAt}` : trainerId;
}

export function useManagedSpecialistProfile() {
  const { session } = useAuthSession();
  const sessionEmail = session?.email;
  const sessionUserId = session?.userId;

  useEffect(() => {
    if (!sessionUserId && !sessionEmail) return;
    ensureSpecialistApplicationsHydrated();
  }, [sessionUserId, sessionEmail]);

  const applicationRevision = useSyncExternalStore(
    subscribeSpecialistApplications,
    () => getApplicationRevision(sessionEmail, sessionUserId),
    () => ""
  );

  const applicationsHydrated = useSyncExternalStore(
    subscribeSpecialistApplications,
    getSpecialistApplicationsHydratedSnapshot,
    getSpecialistApplicationsHydratedServerSnapshot
  );

  const overridesMap = useSyncExternalStore(
    subscribeSpecialistProfiles,
    getSpecialistProfilesSnapshot,
    getSpecialistProfilesServerSnapshot
  );

  /* Re-render when approved catalog hydrates so profileStyle from profile_data
   * is available after reload (live memory overrides are session-only). */
  void useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesSnapshot,
    getApprovedSpecialistProfilesServerSnapshot
  );

  const catalogHydrated = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesHydratedSnapshot,
    getApprovedSpecialistProfilesHydratedServerSnapshot
  );

  const trainerId = resolveManagedSpecialistId(sessionEmail, sessionUserId);
  const application = trainerId
    ? getSpecialistApplicationById(trainerId)
    : null;
  void applicationRevision;
  const base = trainerId ? getManagedTrainerBaseById(trainerId) : undefined;
  const storedOverrides = trainerId ? overridesMap[trainerId] ?? null : null;
  const trainer = base
    ? applySpecialistProfileOverrides(base, storedOverrides)
    : undefined;

  const formDefaults = base ? overridesFromTrainer(base, storedOverrides) : null;

  async function saveForm(
    form: SpecialistProfileEditForm
  ): Promise<ManagedProfileSaveResult> {
    if (!trainerId) {
      return { ok: false, error: "Unable to save changes" };
    }
    return saveManagedSpecialistProfileEdits(trainerId, form);
  }

  const profileCompletion = formDefaults
    ? computeProfileCompletion(formDefaults)
    : 0;

  return {
    trainerId,
    application,
    trainer,
    formDefaults,
    profileCompletion,
    saveForm,
    /** False until applications + approved catalog finish first hydrate. */
    isHydrated: applicationsHydrated && catalogHydrated,
  };
}
