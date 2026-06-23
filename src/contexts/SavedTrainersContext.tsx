"use client";

/**
 * Saved trainers — Supabase when configured; localStorage fallback for dev mock.
 * Consumers use useSavedTrainers(); do not read storage directly.
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
import { getTrainerWithOverrides } from "@/lib/specialist-profile-store";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import type { Trainer } from "@/types";
import { getActiveClientUserId } from "@/lib/saved-trainers-user";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import {
  getSavedTrainersErrorServerSnapshot,
  getSavedTrainersErrorSnapshot,
  getSavedTrainersLoadingServerSnapshot,
  getSavedTrainersLoadingSnapshot,
  getSavedTrainersServerSnapshot,
  getSavedTrainersSnapshot,
  subscribeSavedTrainers,
  toggleSavedTrainerId,
} from "@/lib/saved-trainers-store";

export interface SavedTrainersContextValue {
  isReady: boolean;
  /** False while fetching shortlist from Supabase for the signed-in client */
  isSavesReady: boolean;
  isSavesLoading: boolean;
  savesError: string | null;
  /** Signed-in client — saved list is scoped to this account */
  isClientWithSaves: boolean;
  savedIds: readonly string[];
  savedCount: number;
  isSaved: (trainerId: string) => boolean;
  toggleSaved: (trainerId: string) => Promise<{ ok: boolean; message?: string }>;
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

  const isSavesLoading = useSyncExternalStore(
    subscribe,
    getSavedTrainersLoadingSnapshot,
    getSavedTrainersLoadingServerSnapshot
  );

  const savesError = useSyncExternalStore(
    subscribe,
    getSavedTrainersErrorSnapshot,
    getSavedTrainersErrorServerSnapshot
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

  const isSavesReady = !isClientWithSaves || !isSavesLoading;

  useEffect(() => {
    if (!isClientWithSaves || !isSavesReady) return;
    void applyPendingSaveAfterLogin("client");
  }, [isClientWithSaves, isSavesReady]);

  const openLoginGate = useCallback((specialistId: string) => {
    setPendingSave(specialistId);
    setLoginGateOpen(true);
  }, []);

  const closeLoginGate = useCallback(() => {
    setLoginGateOpen(false);
  }, []);

  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);

  const isSaved = useCallback(
    (trainerId: string) => isSavesReady && savedIdSet.has(trainerId),
    [savedIdSet, isSavesReady]
  );

  const toggleSaved = useCallback((trainerId: string) => {
    return toggleSavedTrainerId(trainerId);
  }, []);

  const getSavedTrainers = useCallback(() => {
    const idSet = new Set(savedIds);
    return listPublicMarketplaceTrainers()
      .filter((t) => idSet.has(t.id))
      .map((t) => getTrainerWithOverrides(t.id) ?? t);
  }, [savedIds]);

  const value = useMemo(
    () => ({
      isReady,
      isSavesReady,
      isSavesLoading,
      savesError,
      isClientWithSaves,
      savedIds,
      savedCount: isSavesReady ? savedIds.length : 0,
      isSaved,
      toggleSaved,
      getSavedTrainers,
      openLoginGate,
    }),
    [
      isReady,
      isSavesReady,
      isSavesLoading,
      savesError,
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
