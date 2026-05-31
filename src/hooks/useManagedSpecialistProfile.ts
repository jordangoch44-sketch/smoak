"use client";

import { useSyncExternalStore, useEffect, useRef } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  applySpecialistProfileOverrides,
  computeProfileCompletion,
  overridesFromTrainer,
} from "@/lib/specialist-profile-overrides";
import {
  describeManagedProfileSource,
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

function getOverridesRevision(
  sessionEmail: string | undefined,
  overridesMap: Record<string, unknown>
): string {
  const trainerId = resolveManagedSpecialistId(sessionEmail);
  if (!trainerId) return "";
  const overrides = overridesMap[trainerId];
  return overrides ? JSON.stringify(overrides) : trainerId;
}

export function useManagedSpecialistProfile() {
  const { session } = useAuthSession();
  const sessionEmail = session?.email;
  const loggedSourceRef = useRef<string | null>(null);

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

  const overridesRevision = getOverridesRevision(sessionEmail, overridesMap);

  const trainerId = resolveManagedSpecialistId(sessionEmail);
  const application = trainerId
    ? getSpecialistApplicationById(trainerId)
    : null;
  const base = trainerId ? getManagedTrainerBaseById(trainerId) : undefined;
  const storedOverrides = trainerId ? overridesMap[trainerId] ?? null : null;
  const trainer = base
    ? applySpecialistProfileOverrides(base, storedOverrides)
    : undefined;

  const formDefaults = base ? overridesFromTrainer(base, storedOverrides) : null;

  useEffect(() => {
    if (!trainerId) return;
    const source = describeManagedProfileSource(trainerId, application);
    const signature = `${source}:${applicationRevision}:${overridesRevision}`;
    if (loggedSourceRef.current === signature) return;
    loggedSourceRef.current = signature;
    console.log("[SMOAC PROFILE SAVE]", `Loaded profile source: ${source}`);
  }, [
    trainerId,
    application,
    applicationRevision,
    overridesRevision,
  ]);

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
