"use client";

/**
 * Saved trainers state — localStorage today, user account / API later.
 * Consumers use useSavedTrainers(); do not read localStorage directly.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { trainers } from "@/data/trainers";
import type { Trainer } from "@/types";
import {
  getSavedTrainersServerSnapshot,
  getSavedTrainersSnapshot,
  setSavedTrainerIds,
  subscribeSavedTrainers,
} from "@/lib/saved-trainers-store";

export interface SavedTrainersContextValue {
  isReady: boolean;
  savedIds: readonly string[];
  savedCount: number;
  isSaved: (trainerId: string) => boolean;
  toggleSaved: (trainerId: string) => void;
  getSavedTrainers: () => Trainer[];
}

const SavedTrainersContext = createContext<SavedTrainersContextValue | null>(
  null
);

function subscribe(onStoreChange: () => void) {
  return subscribeSavedTrainers(onStoreChange);
}

function getSnapshot() {
  return getSavedTrainersSnapshot();
}

function getServerSnapshot() {
  return getSavedTrainersServerSnapshot();
}

function subscribeClientReady() {
  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

export function SavedTrainersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const savedIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const isReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot
  );

  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);

  const isSaved = useCallback(
    (trainerId: string) => savedIdSet.has(trainerId),
    [savedIdSet]
  );

  const toggleSaved = useCallback((trainerId: string) => {
    const current = getSavedTrainersSnapshot();
    const next = current.includes(trainerId)
      ? current.filter((id) => id !== trainerId)
      : [...current, trainerId];
    setSavedTrainerIds(next);
  }, []);

  const getSavedTrainers = useCallback(() => {
    const idSet = new Set(savedIds);
    return trainers.filter((t) => idSet.has(t.id));
  }, [savedIds]);

  const value = useMemo(
    () => ({
      isReady,
      savedIds,
      savedCount: savedIds.length,
      isSaved,
      toggleSaved,
      getSavedTrainers,
    }),
    [isReady, savedIds, isSaved, toggleSaved, getSavedTrainers]
  );

  return (
    <SavedTrainersContext.Provider value={value}>
      {children}
    </SavedTrainersContext.Provider>
  );
}

export function useSavedTrainersContext(): SavedTrainersContextValue {
  const ctx = useContext(SavedTrainersContext);
  if (!ctx) {
    throw new Error(
      "useSavedTrainers must be used within SavedTrainersProvider"
    );
  }
  return ctx;
}
