"use client";

/**
 * Saved trainers state — localStorage today, user account / API later.
 * Consumers use useSavedTrainers(); do not read localStorage directly.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { applyPendingSaveAfterLogin, setPendingSave } from "@/lib/specialist-saves";
import { trainers } from "@/data/trainers";
import type { Trainer } from "@/types";
import { getActiveClientUserId } from "@/lib/saved-trainers-user";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import {
  getSavedTrainersServerSnapshot,
  getSavedTrainersSnapshot,
  setSavedTrainerIds,
  subscribeSavedTrainers,
} from "@/lib/saved-trainers-store";

export interface SavedTrainersContextValue {
  isReady: boolean;
  /** Signed-in client — saved list is scoped to this account */
  isClientWithSaves: boolean;
  savedIds: readonly string[];
  savedCount: number;
  isSaved: (trainerId: string) => boolean;
  toggleSaved: (trainerId: string) => void;
  getSavedTrainers: () => Trainer[];
  /** Queue pending save + open login gate (logged-out save hearts) */
  openLoginGate: (specialistId: string) => void;
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

function subscribeClientReady(onStoreChange: () => void) {
  if (typeof window !== "undefined") {
    onStoreChange();
  }
  return subscribeAuthSession(onStoreChange);
}

function getClientReadySnapshot() {
  return typeof window !== "undefined";
}

function getServerReadySnapshot() {
  return false;
}

export function SavedTrainersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loginGateOpen, setLoginGateOpen] = useState(false);

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

  const isClientWithSaves = useSyncExternalStore(
    subscribeAuthSession,
    () => Boolean(getActiveClientUserId(getAuthSessionSnapshot())),
    () => false
  );

  useEffect(() => {
    if (!isClientWithSaves) return;
    applyPendingSaveAfterLogin("client");
  }, [isClientWithSaves]);

  const openLoginGate = useCallback((specialistId: string) => {
    setPendingSave(specialistId);
    setLoginGateOpen(true);
  }, []);

  const closeLoginGate = useCallback(() => {
    setLoginGateOpen(false);
  }, []);

  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);

  const isSaved = useCallback(
    (trainerId: string) => savedIdSet.has(trainerId),
    [savedIdSet]
  );

  const toggleSaved = useCallback((trainerId: string) => {
    if (!getActiveClientUserId(getAuthSessionSnapshot())) return;

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
      isClientWithSaves,
      savedIds,
      savedCount: savedIds.length,
      isSaved,
      toggleSaved,
      getSavedTrainers,
      openLoginGate,
    }),
    [
      isReady,
      isClientWithSaves,
      savedIds,
      isSaved,
      toggleSaved,
      getSavedTrainers,
      openLoginGate,
    ]
  );

  return (
    <SavedTrainersContext.Provider value={value}>
      {children}
      <LoginGateModal open={loginGateOpen} onClose={closeLoginGate} />
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
