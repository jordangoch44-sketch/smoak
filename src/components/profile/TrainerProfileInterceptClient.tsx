"use client";

import { useEffect, useState } from "react";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";
import { TrainerProfileSheetSkeleton } from "@/components/profile/TrainerProfileSheetSkeleton";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { refreshApprovedSpecialistProfilesFromRemote } from "@/lib/approved-specialist-profiles-store";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { specialistProfileFromRow } from "@/lib/profiles/specialist-profiles-db";
import type { SpecialistProfileRow } from "@/types/database";
import type { Trainer } from "@/types/trainer";

/**
 * Soft-nav profile sheet — open from the in-memory marketplace catalog
 * immediately (no RSC Supabase wait). Rare cold misses fetch one row.
 */
export function TrainerProfileInterceptClient({
  trainerId,
}: {
  trainerId: string;
}) {
  const fromCatalog = useTrainerWithOverrides(trainerId);
  const [fetched, setFetched] = useState<Trainer | null>(null);
  const [fetchDone, setFetchDone] = useState(false);

  useEffect(() => {
    if (fromCatalog) {
      setFetchDone(true);
      return;
    }

    let cancelled = false;
    setFetchDone(false);

    void (async () => {
      refreshApprovedSpecialistProfilesFromRemote();

      const supabase = getMarketplaceAuthClient();
      if (!supabase) {
        if (!cancelled) setFetchDone(true);
        return;
      }

      const { data, error } = await supabase
        .from("specialist_profiles")
        .select("*")
        .eq("id", trainerId)
        .eq("status", "approved")
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        const mapped = specialistProfileFromRow(data as SpecialistProfileRow);
        setFetched(mapped.trainer);
      }
      setFetchDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [fromCatalog, trainerId]);

  const trainer = fromCatalog ?? fetched;

  if (!trainer && !fetchDone) {
    return <TrainerProfileSheetSkeleton />;
  }

  return (
    <TrainerProfilePageClient
      trainerId={trainerId}
      initialTrainer={trainer ?? null}
    />
  );
}
