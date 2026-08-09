"use client";

import { useEffect, useState } from "react";
import { TrainerProfilePageClient } from "@/components/profile/TrainerProfilePageClient";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { refreshApprovedSpecialistProfilesFromRemote } from "@/lib/approved-specialist-profiles-store";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import {
  clearPrimedTrainer,
  peekPrimedTrainer,
} from "@/lib/primed-trainer-profile";
import { specialistProfileFromRow } from "@/lib/profiles/specialist-profiles-db";
import type { SpecialistProfileRow } from "@/types/database";
import type { Trainer } from "@/types/trainer";

/**
 * Soft-nav profile sheet — open from primed card / in-memory catalog
 * immediately (no skeleton flash, no RSC Supabase wait).
 */
export function TrainerProfileInterceptClient({
  trainerId,
}: {
  trainerId: string;
}) {
  const fromCatalog = useTrainerWithOverrides(trainerId);
  const [primed] = useState(() => peekPrimedTrainer(trainerId));
  const [fetched, setFetched] = useState<Trainer | null>(null);

  useEffect(() => {
    clearPrimedTrainer(trainerId);
  }, [trainerId]);

  useEffect(() => {
    if (fromCatalog || primed) return;

    let cancelled = false;

    void (async () => {
      refreshApprovedSpecialistProfilesFromRemote();

      const supabase = getMarketplaceAuthClient();
      if (!supabase) return;

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
    })();

    return () => {
      cancelled = true;
    };
  }, [fromCatalog, primed, trainerId]);

  const trainer = fromCatalog ?? primed ?? fetched;

  return (
    <TrainerProfilePageClient
      trainerId={trainerId}
      initialTrainer={trainer ?? null}
    />
  );
}
