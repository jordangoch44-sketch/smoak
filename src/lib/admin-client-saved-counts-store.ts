"use client";

import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { fetchSavedTrainerCountsForUsers } from "@/lib/saved-trainers-service";
import type { ClientApplication } from "@/types/client-application";

const listeners = new Set<() => void>();
const EMPTY_COUNTS: Record<string, number> = Object.freeze({});

let cachedCounts: Record<string, number> = EMPTY_COUNTS;
let refreshGeneration = 0;

function emitCounts(next: Record<string, number>): void {
  const normalized =
    Object.keys(next).length > 0 ? { ...next } : EMPTY_COUNTS;
  cachedCounts = normalized;
  listeners.forEach((listener) => listener());
}

export function subscribeAdminClientSavedCounts(
  onStoreChange: () => void
): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getAdminClientSavedCountsSnapshot(): Record<string, number> {
  return cachedCounts;
}

export function getAdminClientSavedCountsServerSnapshot(): Record<string, number> {
  return EMPTY_COUNTS;
}

export async function refreshAdminClientSavedCounts(
  clientApplications: readonly ClientApplication[]
): Promise<void> {
  const generation = ++refreshGeneration;
  if (!isMarketplaceSupabaseActive()) {
    emitCounts({});
    return;
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  const userIds = clientApplications
    .map((app) => app.userId?.trim() ?? "")
    .filter(Boolean);

  const result = await fetchSavedTrainerCountsForUsers(supabase, userIds);
  if (generation !== refreshGeneration) return;
  if (!result.ok) return;
  emitCounts(result.countsByUserId);
}
