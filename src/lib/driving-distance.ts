import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

const METERS_PER_MILE = 1609.344;

type DrivingDistanceEntry = {
  miles: number;
};

export type DrivingDistanceSnapshot = {
  originKey: string;
  byTrainerId: Readonly<Record<string, DrivingDistanceEntry>>;
};

const EMPTY_SNAPSHOT: DrivingDistanceSnapshot = {
  originKey: "",
  byTrainerId: {},
};

let snapshot: DrivingDistanceSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function drivingOriginKey(origin: UserGeoPoint): string {
  return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
}

/** Rounded miles shown on specialist cards. */
export function formatDistanceMiles(miles: number): string {
  const value = miles < 20 ? miles.toFixed(1) : String(Math.round(miles));
  return `${value} miles`;
}

export function formatDistanceMilesAway(miles: number): string {
  return `${formatDistanceMiles(miles)} away`;
}

export function subscribeDrivingDistances(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDrivingDistanceSnapshot(): DrivingDistanceSnapshot {
  return snapshot;
}

export function getDrivingDistanceServerSnapshot(): DrivingDistanceSnapshot {
  return EMPTY_SNAPSHOT;
}

export function getDrivingMiles(
  origin: UserGeoPoint,
  trainerId: string
): number | null {
  if (snapshot.originKey !== drivingOriginKey(origin)) return null;
  const entry = snapshot.byTrainerId[trainerId];
  return entry ? entry.miles : null;
}

export function publishDrivingMiles(
  origin: UserGeoPoint,
  trainerIds: readonly string[],
  miles: number
): void {
  if (!Number.isFinite(miles) || miles < 0 || trainerIds.length === 0) return;
  const originKey = drivingOriginKey(origin);
  const byTrainerId =
    snapshot.originKey === originKey ? { ...snapshot.byTrainerId } : {};
  let changed = snapshot.originKey !== originKey;
  for (const trainerId of trainerIds) {
    const current = byTrainerId[trainerId];
    if (current && current.miles === miles) continue;
    byTrainerId[trainerId] = { miles };
    changed = true;
  }
  if (!changed) return;
  snapshot = { originKey, byTrainerId };
  for (const listener of listeners) listener();
}
