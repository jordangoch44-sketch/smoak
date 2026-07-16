"use client";

import { QuickClientAccountModal } from "@/components/auth/QuickClientAccountModal";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
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
      signupTitle="Save this specialist"
      signupSupport="Enter your first name and email to add this specialist to your saved list."
      signupCta="Continue & Save"
    />
  );
}
