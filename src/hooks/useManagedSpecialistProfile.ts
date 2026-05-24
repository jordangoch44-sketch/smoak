"use client";

import { useSyncExternalStore } from "react";
import { DEMO_SPECIALIST_ID } from "@/data/dashboard-mock";
import { getTrainerById } from "@/data/trainers";
import {
  computeProfileCompletion,
  formToOverrides,
  overridesFromTrainer,
} from "@/lib/specialist-profile-overrides";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  getTrainerWithOverrides,
  saveTrainerProfileOverrides,
  subscribeSpecialistProfiles,
  getSpecialistProfilesSnapshot,
  getSpecialistProfilesServerSnapshot,
} from "@/lib/specialist-profile-store";

export function useManagedSpecialistProfile() {
  const overridesMap = useSyncExternalStore(
    subscribeSpecialistProfiles,
    getSpecialistProfilesSnapshot,
    getSpecialistProfilesServerSnapshot
  );

  const storedOverrides = overridesMap[DEMO_SPECIALIST_ID] ?? null;
  const base = getTrainerById(DEMO_SPECIALIST_ID);

  const trainer = getTrainerWithOverrides(DEMO_SPECIALIST_ID);

  const formDefaults = base ? overridesFromTrainer(base, storedOverrides) : null;

  function saveForm(form: SpecialistProfileEditForm) {
    saveTrainerProfileOverrides(DEMO_SPECIALIST_ID, formToOverrides(form));
  }

  const profileCompletion = formDefaults
    ? computeProfileCompletion(formDefaults)
    : 0;

  return {
    trainerId: DEMO_SPECIALIST_ID,
    trainer,
    formDefaults,
    profileCompletion,
    saveForm,
  };
}
