"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import {
  mergeApprovedSpecialistProfileLocal,
  refreshApprovedSpecialistProfilesFromRemote,
} from "@/lib/approved-specialist-profiles-store";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import {
  clearPrimedTrainer,
  peekPrimedTrainer,
} from "@/lib/primed-trainer-profile";
import { fetchApprovedSpecialistByPublicKey } from "@/lib/profiles/specialist-profiles-db";
import { overlayTrainerMembership } from "@/lib/trainer-sponsorship";
import type { Trainer } from "@/types/trainer";

/**
 * Soft-nav profile sheet — opens from primed card / in-memory catalog
 * immediately, then slides up with the full profile.
 *
 * Reads `useParams()` so Picks replace-navigations swap the specialist
 * without waiting on the intercept server page, and without stacking history.
 */
export function TrainerProfileInterceptClient({
  trainerId,
}: {
  trainerId: string;
}) {
  const params = useParams();
  const routeId =
    typeof params?.id === "string" && params.id.length > 0
      ? params.id
      : trainerId;

  const fromCatalog = useTrainerWithOverrides(routeId);
  const [handoff, setHandoff] = useState<Trainer | null>(() =>
    peekPrimedTrainer(routeId)
  );
  const [fetched, setFetched] = useState<Trainer | null>(null);

  useEffect(() => {
    const next = peekPrimedTrainer(routeId);
    setHandoff(next);
    setFetched(null);
    clearPrimedTrainer(routeId);
  }, [routeId]);

  const primed = handoff;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      refreshApprovedSpecialistProfilesFromRemote();

      const supabase = getMarketplaceAuthClient();
      if (!supabase) return;

      const resolved = await fetchApprovedSpecialistByPublicKey(
        supabase,
        routeId
      );
      if (!cancelled && resolved) {
        mergeApprovedSpecialistProfileLocal(resolved);
        setFetched(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const trainer = fetched
    ? overlayTrainerMembership(fromCatalog ?? primed ?? fetched, fetched)
    : fromCatalog ?? primed ?? fetched;
  const resolvedId = trainer?.id ?? routeId;

  return (
    <TrainerProfilePageClient
      trainerId={resolvedId}
      initialTrainer={trainer ?? null}
      intercept
    />
  );
}
