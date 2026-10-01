import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  fetchClientCoaching,
  fetchClientCoachWorkouts,
  fetchSpecialistCoachWorkouts,
  fetchSpecialistRoster,
} from "@/lib/coaching/coaching-service";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";

/** One cached snapshot per viewer so the dashboard, calendar, and threads share a fetch. */
export interface CoachingSnapshot {
  loaded: boolean;
  relationships: CoachingRelationship[];
  workouts: CoachWorkout[];
}

export const EMPTY_COACHING: CoachingSnapshot = { loaded: false, relationships: [], workouts: [] };

type Viewer = "client" | "specialist";

const snapshots = new Map<string, CoachingSnapshot>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function cacheKey(viewer: Viewer, id: string): string {
  return `${viewer}:${id}`;
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeCoaching(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCoachingSnapshot(viewer: Viewer, id: string | null): CoachingSnapshot {
  if (!id) return EMPTY_COACHING;
  return snapshots.get(cacheKey(viewer, id)) ?? EMPTY_COACHING;
}

/** Client: `id` is the auth user id. Specialist: `id` is the marketplace specialist id. */
export function refreshCoaching(viewer: Viewer, id: string): Promise<void> {
  const key = cacheKey(viewer, id);
  const running = inFlight.get(key);
  if (running) return running;
  if (!isMarketplaceSupabaseActive()) return Promise.resolve();
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return Promise.resolve();

  const job = (async () => {
    const [relationships, workouts] =
      viewer === "client"
        ? await Promise.all([
            fetchClientCoaching(supabase, id),
            fetchClientCoachWorkouts(supabase, id),
          ])
        : await Promise.all([
            fetchSpecialistRoster(supabase, id),
            fetchSpecialistCoachWorkouts(supabase, id),
          ]);
    const previous = snapshots.get(key);
    snapshots.set(key, {
      loaded: true,
      relationships: relationships.ok ? relationships.data : (previous?.relationships ?? []),
      workouts: workouts.ok ? workouts.data : (previous?.workouts ?? []),
    });
    emit();
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, job);
  return job;
}

/** Apply a local change right away (after an RPC succeeds). */
export function patchCoaching(
  viewer: Viewer,
  id: string,
  update: (snapshot: CoachingSnapshot) => CoachingSnapshot
): void {
  const key = cacheKey(viewer, id);
  snapshots.set(key, update(snapshots.get(key) ?? { ...EMPTY_COACHING, loaded: true }));
  emit();
}

export function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return [next, ...items];
  const copy = [...items];
  copy[index] = next;
  return copy;
}
