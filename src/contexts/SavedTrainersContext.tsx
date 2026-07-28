"use client";

/**
 * Saved trainers — Supabase when configured; localStorage fallback for dev mock.
 * Consumers use useSavedTrainers(); do not read storage directly.
 * Logged-out heart → SaveQuickSignupModal (pending save + lightweight client account).
 *
 * Modal open/close lives in `save-signup-modal-store` + SavedTrainersOverlayHost so
 * closing the gate does not re-render the entire site tree under this provider.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { SavedTrainersOverlayHost } from "@/components/auth/SavedTrainersOverlayHost";
import { setPendingSave } from "@/lib/specialist-saves";
import { resolveSavedTrainers } from "@/lib/resolve-saved-trainers";
import { openSaveSignupModal } from "@/lib/save-signup-modal-store";
import type { Trainer } from "@/types";
import { getActiveClientUserId } from "@/lib/saved-trainers-user";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import {
  getApprovedSpecialistProfilesHydratedSnapshot,
  getApprovedSpecialistProfilesServerSnapshot,
  getApprovedSpecialistProfilesSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
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

export interface OpenSaveQuickSignupOptions {
  specialistName?: string;
  profilePath?: string;
}

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
  /** Queue pending save + open quick-signup (logged-out save hearts) */
  openSaveQuickSignup: (
    specialistId: string,
    options?: OpenSaveQuickSignupOptions
  ) => void;
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

  const isSavesReady =
    !isClientWithSaves || !isSavesLoading || savesError !== null;

  const openSaveQuickSignup = useCallback(
    (specialistId: string, options?: OpenSaveQuickSignupOptions) => {
      const id = specialistId.trim();
      if (!id) return;
      const resolved = resolveSavedTrainers([id])[0];
      const name =
        options?.specialistName?.trim() ||
        (resolved && resolved.name !== "Specialist unavailable"
          ? resolved.name.trim()
          : undefined);
      const path =
        options?.profilePath?.trim() ||
        (typeof window !== "undefined" ? window.location.pathname : "") ||
        `/trainers/${id}`;

      setPendingSave(id, { specialistName: name, profilePath: path });
      openSaveSignupModal({
        specialistId: id,
        specialistName: name,
        profilePath: path,
      });
    },
    []
  );

  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);

  /* Recompute when catalog hydrates — badge count used to show while list stayed empty */
  const approvedCatalog = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesSnapshot,
    getApprovedSpecialistProfilesServerSnapshot
  );
  const approvedHydrated = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesHydratedSnapshot,
    () => false
  );

  const isSaved = useCallback(
    (trainerId: string) => isSavesReady && savedIdSet.has(trainerId),
    [savedIdSet, isSavesReady]
  );

  const toggleSaved = useCallback((trainerId: string) => {
    return toggleSavedTrainerId(trainerId);
  }, []);

  const savedTrainersList = useMemo(
    () => resolveSavedTrainers(savedIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalog identity for refresh
    [savedIds, approvedCatalog, approvedHydrated]
  );

  const getSavedTrainers = useCallback(() => {
    return savedTrainersList;
  }, [savedTrainersList]);

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
      openSaveQuickSignup,
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
      openSaveQuickSignup,
    ]
  );

  return (
    <SavedTrainersContext.Provider value={value}>
      {children}
      <SavedTrainersOverlayHost />
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
