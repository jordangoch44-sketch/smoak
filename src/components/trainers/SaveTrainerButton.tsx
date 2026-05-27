"use client";

import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { SAVE_TOAST_ADDED, SAVE_TOAST_REMOVED } from "@/lib/saved-ui";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  canSaveSpecialists,
  getUserRole,
  isLoggedIn,
} from "@/lib/specialist-saves";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";

interface SaveTrainerButtonProps {
  trainerId: string;
  className?: string;
  /** Pin to top-right of trainer card (default true) */
  overlay?: boolean;
}

/** Trainer card / profile save control — auth-gated with pending-save workflow */
export function SaveTrainerButton({
  trainerId,
  className,
  overlay = true,
}: SaveTrainerButtonProps) {
  const { session } = useAuthSession();
  const { isSaved, toggleSaved, openLoginGate } = useSavedTrainers();
  const { showToast } = useSaveToast();
  const saved = isSaved(trainerId);

  function handleToggle() {
    if (saved) {
      if (canSaveSpecialists(session)) {
        toggleSaved(trainerId);
        showToast(SAVE_TOAST_REMOVED);
      }
      return;
    }

    if (!isLoggedIn(session)) {
      openLoginGate(trainerId);
      return;
    }

    const role = getUserRole(session);
    if (role === "specialist") {
      showToast({
        title: "Switch to a client account to save specialists.",
        variant: "neutral",
      });
      return;
    }

    if (!canSaveSpecialists(session)) {
      openLoginGate(trainerId);
      return;
    }

    toggleSaved(trainerId);
    showToast(SAVE_TOAST_ADDED);
  }

  return (
    <SaveButton
      saved={saved}
      onToggle={handleToggle}
      overlay={overlay}
      className={className}
    />
  );
}
