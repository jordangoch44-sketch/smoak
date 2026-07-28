import {
  loadHiddenTrainerIds,
  persistHiddenTrainerIds,
} from "@/lib/hidden-trainers-storage";

const EMPTY_SNAPSHOT: string[] = [];

let cachedIds: readonly string[] = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function idsKey(ids: readonly string[]): string {
  return ids.length === 0 ? "" : ids.join("\0");
}

function readCache(): readonly string[] {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }

  /* First access: offline/dev may seed from localStorage; live starts empty
   * until remote moderation sync fills memory. */
  if (cachedIds === EMPTY_SNAPSHOT) {
    const loaded = loadHiddenTrainerIds();
    cachedIds = loaded.length > 0 ? [...loaded] : EMPTY_SNAPSHOT;
  }

  return cachedIds;
}

export function subscribeHiddenTrainers(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHiddenTrainersSnapshot(): readonly string[] {
  return readCache();
}

export function getHiddenTrainersServerSnapshot(): readonly string[] {
  return EMPTY_SNAPSHOT;
}

export function setHiddenTrainerIds(next: string[]): void {
  const unique = [...new Set(next)];
  const nextCache: readonly string[] =
    unique.length > 0 ? unique : EMPTY_SNAPSHOT;

  if (idsKey(nextCache) === idsKey(cachedIds)) {
    return;
  }

  cachedIds = nextCache;
  persistHiddenTrainerIds(unique);
  listeners.forEach((listener) => listener());
}

export function hideTrainerId(trainerId: string): void {
  const current = [...getHiddenTrainersSnapshot()];
  if (current.includes(trainerId)) return;
  setHiddenTrainerIds([...current, trainerId]);
}

export function unhideTrainerId(trainerId: string): void {
  setHiddenTrainerIds(
    [...getHiddenTrainersSnapshot()].filter((id) => id !== trainerId)
  );
}

export function toggleHiddenTrainerId(trainerId: string): boolean {
  const current = getHiddenTrainersSnapshot();
  if (current.includes(trainerId)) {
    unhideTrainerId(trainerId);
    return false;
  }
  hideTrainerId(trainerId);
  return true;
}
