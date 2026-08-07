"use client";

import { useSyncExternalStore } from "react";
import { fetchSpecialistReviewAggregates } from "@/lib/reviews/specialist-reviews-client";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";

const cache = new Map<string, SpecialistReviewAggregate>();
const serverCache = new Map<string, SpecialistReviewAggregate>();
const loaded = new Set<string>();
const listeners = new Set<() => void>();
const queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function emptyAggregate(specialistId: string): SpecialistReviewAggregate {
  return { specialistId, reviewCount: 0, avgRating: null };
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function scheduleFlush(): void {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, 0);
}

async function flushQueue(): Promise<void> {
  const ids = [...queued].filter((id) => id && !loaded.has(id));
  queued.clear();
  if (ids.length === 0) return;

  for (const id of ids) {
    if (!cache.has(id)) cache.set(id, emptyAggregate(id));
  }
  notify();

  try {
    const map = await fetchSpecialistReviewAggregates(ids);
    for (const id of ids) {
      cache.set(id, map.get(id) ?? emptyAggregate(id));
      loaded.add(id);
    }
  } catch {
    for (const id of ids) {
      cache.set(id, emptyAggregate(id));
      loaded.add(id);
    }
  }
  notify();
}

function ensureQueued(specialistId: string): void {
  if (!specialistId || loaded.has(specialistId) || queued.has(specialistId)) {
    return;
  }
  if (!cache.has(specialistId)) {
    cache.set(specialistId, emptyAggregate(specialistId));
  }
  queued.add(specialistId);
  scheduleFlush();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getClientSnapshot(specialistId: string): SpecialistReviewAggregate {
  ensureQueued(specialistId);
  return cache.get(specialistId) ?? emptyAggregate(specialistId);
}

function getServerSnapshot(specialistId: string): SpecialistReviewAggregate {
  let agg = serverCache.get(specialistId);
  if (!agg) {
    agg = emptyAggregate(specialistId);
    serverCache.set(specialistId, agg);
  }
  return agg;
}

/**
 * Live SMOAC aggregate for cards/lists. Batches concurrent id requests.
 * Display-only — leave-review stays on the profile sheet.
 */
export function useSmoacReviewAggregate(
  specialistId: string
): SpecialistReviewAggregate {
  return useSyncExternalStore(
    subscribe,
    () => getClientSnapshot(specialistId),
    () => getServerSnapshot(specialistId)
  );
}
