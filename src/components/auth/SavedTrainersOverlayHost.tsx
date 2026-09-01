"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SaveQuickSignupModal } from "@/components/auth/SaveQuickSignupModal";
import { SaveSuccessModal } from "@/components/auth/SaveSuccessModal";
import { isPendingSaveLocked, peekPendingSaveResume } from "@/lib/auth/pending-save-resume";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import { subscribeSaveApplied } from "@/lib/save-applied-events";
import type { PendingSaveRecord } from "@/lib/dev-storage-keys";
import {
  closeSaveSignupModal,
  getSaveSignupModalServerSnapshot,
  getSaveSignupModalSnapshot,
  subscribeSaveSignupModal,
} from "@/lib/save-signup-modal-store";
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
} from "@/lib/saved-trainers-store";

/**
 * Portaled save-auth overlays. Isolated from SavedTrainersProvider children so
 * open/close does not rebuild the homepage tree on the critical close path.
 */
export function SavedTrainersOverlayHost() {
  const signup = useSyncExternalStore(
    subscribeSaveSignupModal,
    getSaveSignupModalSnapshot,
    getSaveSignupModalServerSnapshot
  );
  const [successOpen, setSuccessOpen] = useState(false);
  const [successName, setSuccessName] = useState<string | undefined>();
  const lastConfirmRef = useRef<{ id: string; at: number } | null>(null);

  const isClientWithSaves = useSyncExternalStore(
    subscribeAuthSession,
    () => Boolean(getActiveClientUserId(getAuthSessionSnapshot())),
    () => false
  );
  const isSavesLoading = useSyncExternalStore(
    subscribeSavedTrainers,
    getSavedTrainersLoadingSnapshot,
    getSavedTrainersLoadingServerSnapshot
  );
  const savesError = useSyncExternalStore(
    subscribeSavedTrainers,
    getSavedTrainersErrorSnapshot,
    getSavedTrainersErrorServerSnapshot
  );
  void useSyncExternalStore(
    subscribeSavedTrainers,
    getSavedTrainersSnapshot,
    getSavedTrainersServerSnapshot
  );
  const isSavesReady =
    !isClientWithSaves || !isSavesLoading || savesError !== null;

  const showSavedConfirmation = useCallback((record: PendingSaveRecord) => {
    const now = Date.now();
    const prev = lastConfirmRef.current;
    if (prev && prev.id === record.specialistId && now - prev.at < 5000) {
      return;
    }
    lastConfirmRef.current = { id: record.specialistId, at: now };
    closeSaveSignupModal();
    setSuccessName(record.specialistName);
    setSuccessOpen(true);
  }, []);

  useEffect(() => {
    return subscribeSaveApplied(showSavedConfirmation);
  }, [showSavedConfirmation]);

  useEffect(() => {
    if (!isClientWithSaves || !isSavesReady) return;
    if (typeof window !== "undefined") {
      if (isPendingSaveLocked() || peekPendingSaveResume()) return;
      if (window.location.pathname.startsWith("/complete-account")) return;
    }
    const role = getAuthSessionSnapshot()?.role;
    if (role !== "client") return;
    void (async () => {
      const result = await applyPendingSaveAfterLogin(role);
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

  const handleCloseSignup = useCallback(() => {
    closeSaveSignupModal();
  }, []);

  return (
    <>
      <SaveQuickSignupModal
        open={signup.open}
        onClose={handleCloseSignup}
        specialistId={signup.specialistId}
        specialistName={signup.specialistName}
        profilePath={signup.profilePath || `/trainers/${signup.specialistId}`}
        onSaved={showSavedConfirmation}
      />
      <SaveSuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        specialistName={successName}
      />
    </>
  );
}
