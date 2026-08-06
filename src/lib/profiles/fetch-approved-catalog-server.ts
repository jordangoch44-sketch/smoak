import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  fetchApprovedSpecialistProfiles,
  specialistProfileFromRow,
} from "@/lib/profiles/specialist-profiles-db";
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import type { SpecialistProfileRow } from "@/types/database";
import type { Trainer } from "@/types/trainer";

/**
 * Anon client for public catalog reads.
 * Never uses cookies() — safe in generateStaticParams / build and request SSR.
 */
function getCatalogSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchApprovedCatalogUncached(): Promise<Trainer[]> {
  const supabase = getCatalogSupabaseClient();
  if (!supabase) return [];

  const result = await fetchApprovedSpecialistProfiles(supabase);
  if (!result.ok) {
    console.warn(
      "[SMOAC catalog] fetchApprovedSpecialistProfiles failed:",
      result.message
    );
    return [];
  }
  return result.profiles;
}

/**
 * Cross-request cache so soft nav between Home / Explore is not a cold
 * Supabase round-trip every tap. ~45s is enough for marketplace freshness.
 */
const loadApprovedCatalogCached = unstable_cache(
  fetchApprovedCatalogUncached,
  ["approved-specialist-catalog-v1"],
  { revalidate: 45, tags: ["public-catalog"] }
);

/** Approved specialist_profiles for SSR / first paint. Empty when unset or error. */
export async function loadApprovedCatalogForServer(): Promise<Trainer[]> {
  return loadApprovedCatalogCached();
}

/**
 * Public marketplace list for SSR.
 *
 * - Supabase configured → always `live` (approved rows only; empty list is valid).
 * - Supabase not configured → `seed` demo catalog (local-only, never written to DB here).
 *
 * Wrapped in React `cache()` so Home + nested fetches share one result per request.
 */
export const loadPublicCatalogForServer = cache(
  async (): Promise<{
    trainers: Trainer[];
    mode: "live" | "seed";
  }> => {
    if (!isSupabaseConfigured()) {
      const { trainers } = await import("@/data/trainers");
      return { trainers: trainers.slice(), mode: "seed" };
    }

    const approved = await loadApprovedCatalogForServer();
    return { trainers: approved, mode: "live" };
  }
);

/** Resolve a public profile by id for SSR. Live mode never falls back to seed. */
export async function loadPublicTrainerByIdForServer(
  id: string
): Promise<Trainer | null> {
  const { trainers, mode } = await loadPublicCatalogForServer();
  const fromCatalog = trainers.find((t) => t.id === id);
  if (fromCatalog) return fromCatalog;

  if (mode === "seed") {
    const { getTrainerById } = await import("@/data/trainers");
    return getTrainerById(id) ?? null;
  }

  /* Live: fetch single approved row in case list was empty/partial */
  const supabase = getCatalogSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("specialist_profiles")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) return null;
  return specialistProfileFromRow(data as SpecialistProfileRow).trainer;
}
