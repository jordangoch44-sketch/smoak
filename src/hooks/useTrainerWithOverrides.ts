"use client";

import { useSyncExternalStore } from "react";
import type { Trainer } from "@/types";
import {
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import { getPublicMarketplaceTrainerBaseById } from "@/lib/marketplace-public-catalog";
import { applySpecialistProfileOverrides } from "@/lib/specialist-profile-overrides";
import {
  getSpecialistApplicationsServerSnapshot,
  getSpecialistApplicationsSnapshot,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";
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
  void useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesSnapshot,
    getApprovedSpecialistProfilesServerSnapshot
  );
  void useSyncExternalStore(
    subscribeSpecialistApplications,
    getSpecialistApplicationsSnapshot,
    getSpecialistApplicationsServerSnapshot
  );

  const base = getPublicMarketplaceTrainerBaseById(trainerId);
  if (!base) return undefined;

  return applySpecialistProfileOverrides(base, overridesMap[trainerId]);
}
