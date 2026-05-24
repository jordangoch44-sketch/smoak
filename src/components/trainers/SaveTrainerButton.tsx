"use client";

import { useState } from "react";
import { SaveButton } from "@/components/ui/SaveButton";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { useSaveToast } from "@/contexts/SaveToastContext";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  canSaveSpecialists,
  getUserRole,
  isLoggedIn,
  saveSpecialist,
  setPendingSave,
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
  const { isReady, session } = useAuthSession();
  const { isSaved, toggleSaved } = useSavedTrainers();
  const { showToast } = useSaveToast();
  const [gateOpen, setGateOpen] = useState(false);
  const saved = isSaved(trainerId);

  function handleToggle() {
    if (saved) {
      toggleSaved(trainerId);
      return;
    }

    if (!isReady) return;

    if (!isLoggedIn(session)) {
      setPendingSave(trainerId);
      setGateOpen(true);
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
      setPendingSave(trainerId);
      setGateOpen(true);
      return;
    }

    saveSpecialist(trainerId);
    showToast({
      title: "Added to your saved specialists.",
      linkHref: "/saved",
      linkLabel: "View saved specialists →",
    });
  }

  return (
    <>
      <SaveButton
        saved={saved}
        onToggle={handleToggle}
        overlay={overlay}
        className={className}
      />
      <LoginGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </>
  );
}
