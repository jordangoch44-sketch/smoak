import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchSmoacReviewAggregates } from "@/lib/reviews/specialist-review-aggregates-query";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

function getAnonClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** SSR / server: SMOAC review aggregates for ranking surfaces. */
export async function loadSmoacReviewAggregatesForServer(
  specialistIds: string[]
): Promise<Map<string, SpecialistReviewAggregate>> {
  const supabase = getAnonClient();
  if (!supabase) return new Map();
  return fetchSmoacReviewAggregates(supabase, specialistIds);
}
