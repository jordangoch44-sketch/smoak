"use client";

import { useSyncExternalStore } from "react";
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
  getSpecialistApplicationById,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  getSpecialistProfilesSnapshot,
  getSpecialistProfilesServerSnapshot,
  subscribeSpecialistProfiles,
} from "@/lib/specialist-profile-store";

function getApplicationRevision(sessionEmail?: string): string {
  const trainerId = resolveManagedSpecialistId(sessionEmail);
  if (!trainerId) return "";
  const application = getSpecialistApplicationById(trainerId);
  return application ? `${application.id}:${application.updatedAt}` : trainerId;
}

export function useManagedSpecialistProfile() {
  const { session } = useAuthSession();
  const sessionEmail = session?.email;

  const applicationRevision = useSyncExternalStore(
    subscribeSpecialistApplications,
    () => getApplicationRevision(sessionEmail),
    () => ""
  );

  const overridesMap = useSyncExternalStore(
    subscribeSpecialistProfiles,
    getSpecialistProfilesSnapshot,
    getSpecialistProfilesServerSnapshot
  );

  const trainerId = resolveManagedSpecialistId(sessionEmail);
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

  function saveForm(form: SpecialistProfileEditForm): ManagedProfileSaveResult {
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
  };
}
