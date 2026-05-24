import type { Trainer } from "@/types";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";
import { getTrainerById as getBaseTrainerById } from "@/data/trainers";
import {
  applySpecialistProfileOverrides,
  loadAllSpecialistOverrides,
  saveSpecialistOverridesForId,
} from "@/lib/specialist-profile-overrides";

const EMPTY_OVERRIDES_SNAPSHOT: Record<string, SpecialistProfileOverrides> =
  Object.freeze({});

const listeners = new Set<() => void>();
let cachedOverrides: Record<string, SpecialistProfileOverrides> | undefined;

function readCache(): Record<string, SpecialistProfileOverrides> {
  if (typeof window === "undefined") {
    return EMPTY_OVERRIDES_SNAPSHOT;
  }
  if (cachedOverrides === undefined) {
    const loaded = loadAllSpecialistOverrides();
    cachedOverrides =
      Object.keys(loaded).length > 0 ? loaded : EMPTY_OVERRIDES_SNAPSHOT;
  }
  return cachedOverrides;
}

export function subscribeSpecialistProfiles(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getSpecialistProfilesServerSnapshot(): Record<
  string,
  SpecialistProfileOverrides
> {
  return EMPTY_OVERRIDES_SNAPSHOT;
}

export function getSpecialistProfilesSnapshot(): Record<
  string,
  SpecialistProfileOverrides
> {
  return readCache();
}

export function getTrainerWithOverrides(trainerId: string): Trainer | undefined {
  const base = getBaseTrainerById(trainerId);
  if (!base) return undefined;
  const overrides = readCache()[trainerId];
  return applySpecialistProfileOverrides(base, overrides);
}

export function saveTrainerProfileOverrides(
  trainerId: string,
  overrides: SpecialistProfileOverrides
): void {
  saveSpecialistOverridesForId(trainerId, overrides);
  cachedOverrides = loadAllSpecialistOverrides();
  listeners.forEach((listener) => listener());
}
