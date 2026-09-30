"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  fetchWorkoutEmailsEnabled,
  saveWorkoutEmailsEnabled,
} from "@/lib/workouts/client-email-preferences";

/** Workout streak email switch. `available` is false without a live account. */
export function useWorkoutEmailPreference(userId: string | null) {
  const [enabled, setEnabled] = useState(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!userId || !isMarketplaceSupabaseActive()) return;
    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;
    let cancelled = false;
    void fetchWorkoutEmailsEnabled(supabase, userId).then((value) => {
      if (cancelled || value === null) return;
      setEnabled(value);
      setAvailable(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setWorkoutEmails = useCallback(
    (next: boolean) => {
      const supabase = getMarketplaceAuthClient();
      if (!userId || !supabase) return;
      setEnabled(next);
      void saveWorkoutEmailsEnabled(supabase, userId, next).then((saved) => {
        if (!saved) setEnabled(!next);
      });
    },
    [userId]
  );

  return { enabled, available, setWorkoutEmails };
}
