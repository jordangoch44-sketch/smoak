"use client";

/**
 * Saved trainers — Supabase when configured; localStorage fallback for dev mock.
 * Consumers use useSavedTrainers(); do not read storage directly.
 * Logged-out heart → SaveQuickSignupModal (pending save + lightweight client account).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { SaveQuickSignupModal } from "@/components/auth/SaveQuickSignupModal";
import { SaveSuccessModal } from "@/components/auth/SaveSuccessModal";
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
import type { PendingSaveRecord } from "@/lib/dev-storage-keys";
import { subscribeSaveApplied } from "@/lib/save-applied-events";

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
  const [signupOpen, setSignupOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [gateSpecialistId, setGateSpecialistId] = useState("");
  const [gateSpecialistName, setGateSpecialistName] = useState<string | undefined>();
  const [gateProfilePath, setGateProfilePath] = useState("");
  const [successName, setSuccessName] = useState<string | undefined>();
  const lastConfirmRef = useRef<{ id: string; at: number } | null>(null);

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

  const showSavedConfirmation = useCallback((record: PendingSaveRecord) => {
    const now = Date.now();
    const prev = lastConfirmRef.current;
    if (prev && prev.id === record.specialistId && now - prev.at < 5000) {
      return;
    }
    lastConfirmRef.current = { id: record.specialistId, at: now };
    setSignupOpen(false);
    setSuccessName(record.specialistName);
    setSuccessOpen(true);
  }, []);

  useEffect(() => {
    return subscribeSaveApplied(showSavedConfirmation);
  }, [showSavedConfirmation]);

  /**
   * Flush pending save after client login when the quick-signup modal did not
   * already complete it (e.g. full /login, magic-link return after profile ensure).
   */
  useEffect(() => {
    if (!isClientWithSaves || !isSavesReady) return;
    void (async () => {
      const result = await applyPendingSaveAfterLogin("client");
      if (result.kind !== "client-saved") return;
      showSavedConfirmation(
        result.record ?? {
          specialistId: result.specialistId,
          actionType: "save_specialist",
          createdAt: new Date().toISOString(),
        }
      );
    })();
  }, [isClientWithSaves, isSavesReady, showSavedConfirmation]);

  const openSaveQuickSignup = useCallback(
    (specialistId: string, options?: OpenSaveQuickSignupOptions) => {
      const id = specialistId.trim();
      if (!id) return;
      const trainer = getTrainerWithOverrides(id);
      const name =
        options?.specialistName?.trim() || trainer?.name?.trim() || undefined;
      const path =
        options?.profilePath?.trim() ||
        (typeof window !== "undefined" ? window.location.pathname : "") ||
        `/trainers/${id}`;

      setPendingSave(id, { specialistName: name, profilePath: path });
      setGateSpecialistId(id);
      setGateSpecialistName(name);
      setGateProfilePath(path);
      setSignupOpen(true);
    },
    []
  );

  const closeSignup = useCallback(() => {
    setSignupOpen(false);
  }, []);

  const closeSuccess = useCallback(() => {
    setSuccessOpen(false);
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
      <SaveQuickSignupModal
        open={signupOpen}
        onClose={closeSignup}
        specialistId={gateSpecialistId}
        specialistName={gateSpecialistName}
        profilePath={gateProfilePath || `/trainers/${gateSpecialistId}`}
        onSaved={showSavedConfirmation}
      />
      <SaveSuccessModal
        open={successOpen}
        onClose={closeSuccess}
        specialistName={successName}
      />
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
