"use client";

import { QuickClientAccountModal } from "@/components/auth/QuickClientAccountModal";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { PendingSaveRecord } from "@/lib/dev-storage-keys";

export interface SaveQuickSignupModalProps {
  open: boolean;
  onClose: () => void;
  specialistId: string;
  specialistName?: string;
  profilePath: string;
  /** Called after the specialist is written to the saved list */
  onSaved: (record: PendingSaveRecord) => void;
}

export function SaveQuickSignupModal({
  open,
  onClose,
  specialistId,
  specialistName,
  profilePath,
  onSaved,
}: SaveQuickSignupModalProps) {
  const { session } = useAuthSession();
  const isSpecialistSession = session?.role === "specialist";

  async function handleAuthenticated() {
    const applied = await applyPendingSaveAfterLogin("client");
    if (applied.kind === "client-saved" && applied.record) {
      onSaved(applied.record);
      onClose();
      return;
    }
    if (applied.kind === "client-saved") {
      onSaved({
        specialistId: applied.specialistId,
        specialistName,
        profilePath,
        actionType: "save_specialist",
        createdAt: new Date().toISOString(),
      });
      onClose();
      return;
    }
    if (applied.kind === "specialist-blocked") {
      // Leave modal open — surface via toast from caller if needed
      return;
    }
  }

  return (
    <QuickClientAccountModal
      open={open}
      onClose={onClose}
      purpose="save"
      returnPath={profilePath || `/trainers/${specialistId}`}
      specialistName={specialistName}
      onAuthenticated={handleAuthenticated}
      signupTitle={
        isSpecialistSession
          ? "Client account required"
          : "Save this specialist"
      }
      signupSupport={
        isSpecialistSession
          ? "You are signed in to a specialist profile. To save favorites, create or log in to a client account."
          : "Enter your first name and email to add this specialist to your saved list."
      }
      signupCta={
        isSpecialistSession
          ? "Create Client Account"
          : "Continue & Save"
      }
      signInTitle={
        isSpecialistSession
          ? "Log in to a client account"
          : "Log in to save"
      }
      signInSupport={
        isSpecialistSession
          ? "Sign in with a client account to save favorites and view your shortlist."
          : `Sign in to add${specialistName ? ` ${specialistName}` : " this specialist"} to your saved list.`
      }
      signInCta={
        isSpecialistSession
          ? "Log in as Client"
          : "Log in & Save"
      }
    />
  );
}
