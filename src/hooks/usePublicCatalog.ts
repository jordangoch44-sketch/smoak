"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getApprovedSpecialistProfilesHydratedServerSnapshot,
  getApprovedSpecialistProfilesHydratedSnapshot,
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import {
  getPublicCatalogMode,
  setPublicCatalogMode,
  type PublicCatalogMode,
} from "@/lib/public-catalog-mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Trainer } from "@/types/trainer";

function resolveClientCatalogMode(): PublicCatalogMode {
  const primed = getPublicCatalogMode();
  if (primed === "live" || primed === "seed") return primed;
  return isSupabaseConfigured() ? "live" : "seed";
}

/**
 * Session-cached public catalog for Marketplace / Search soft nav.
 * After the first hydrate, tab switches reuse memory — no RSC Supabase wait.
 */
export function usePublicCatalog(): {
  trainers: Trainer[];
  catalogMode: PublicCatalogMode;
  catalogHydrated: boolean;
} {
  const profiles = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesSnapshot,
    getApprovedSpecialistProfilesServerSnapshot
  );
  const catalogHydrated = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesHydratedSnapshot,
    getApprovedSpecialistProfilesHydratedServerSnapshot
  );

  const catalogMode = resolveClientCatalogMode();

  useEffect(() => {
    if (getPublicCatalogMode() === "unknown") {
      setPublicCatalogMode(catalogMode);
    }
  }, [catalogMode]);

  const trainers = useMemo(() => Object.values(profiles), [profiles]);

  return { trainers, catalogMode, catalogHydrated };
}
