"use client";

import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveToast } from "@/contexts/SaveToastContext";
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
      });
      return;
    }

    if (!canSaveSpecialists(session)) {
      openLoginGate(trainerId);
      return;
    }

    toggleSaved(trainerId);
    showToast({
      title: "Added to your saved specialists.",
      linkHref: "/saved",
      linkLabel: "View saved specialists →",
    });
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
