"use client";

import { useSyncExternalStore } from "react";
import type { Trainer } from "@/types";
import {
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { getPublicMarketplaceTrainerBaseById } from "@/lib/marketplace-public-catalog";
import { isLivePublicCatalogMode } from "@/lib/public-catalog-mode";
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

/** Public trainer record — live catalog skips stale browser overrides. */
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

  /* Match getTrainerWithOverrides: approved row is display SoT when live */
  if (isLivePublicCatalogMode() || isMarketplaceSupabaseActive()) {
    return base;
  }

  return applySpecialistProfileOverrides(base, overridesMap[trainerId]);
}
