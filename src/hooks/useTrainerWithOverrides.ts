"use client";

import { useSyncExternalStore } from "react";
import type { Trainer } from "@/types";
import { getTrainerById as getBaseTrainerById } from "@/data/trainers";
import { applySpecialistProfileOverrides } from "@/lib/specialist-profile-overrides";
import {
  getSpecialistProfilesServerSnapshot,
  getSpecialistProfilesSnapshot,
  subscribeSpecialistProfiles,
} from "@/lib/specialist-profile-store";

/** Trainer record merged with DEV specialist dashboard edits */
export function useTrainerWithOverrides(
  trainerId: string
): Trainer | undefined {
  const overridesMap = useSyncExternalStore(
    subscribeSpecialistProfiles,
    getSpecialistProfilesSnapshot,
    getSpecialistProfilesServerSnapshot
  );

  const base = getBaseTrainerById(trainerId);
  if (!base) return undefined;

  return applySpecialistProfileOverrides(base, overridesMap[trainerId]);
}
