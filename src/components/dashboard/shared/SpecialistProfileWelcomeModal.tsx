"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  SMOAC_PROFILE_WELCOME,
  SPECIALIST_PROFILE_WELCOME_LOCK_CLASS,
} from "@/lib/specialist-profile-welcome";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";

interface SpecialistProfileWelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartWithPhotos: () => void;
}

/**
 * One-time glass welcome after a specialist is approved and first signs in.
 * Nudges them to finish photos/profile and explains the complimentary Pro trial.
 */
export function SpecialistProfileWelcomeModal({
  open,
  onClose,
  onStartWithPhotos,
}: SpecialistProfileWelcomeModalProps) {
  useEffect(() => {
    if (!open) return;

    document.body.classList.add(SPECIALIST_PROFILE_WELCOME_LOCK_CLASS);
    document.documentElement.classList.add(SPECIALIST_PROFILE_WELCOME_LOCK_CLASS);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(SPECIALIST_PROFILE_WELCOME_LOCK_CLASS);
      document.documentElement.classList.remove(
        SPECIALIST_PROFILE_WELCOME_LOCK_CLASS
      );
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <DashboardModalScrim
      className="dashboard-modal--welcome"
      onDismiss={onClose}
    >
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-welcome-title"
        aria-describedby="profile-welcome-desc"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <DashboardModalCloseButton onClose={onClose} />
        <div className="dashboard-modal__content">
          <p className="dashboard-modal__eyebrow">
            {SMOAC_PROFILE_WELCOME.eyebrow}
          </p>
          <h2 id="profile-welcome-title" className="dashboard-modal__title">
            {SMOAC_PROFILE_WELCOME.title}
          </h2>
          <p id="profile-welcome-desc" className="dashboard-modal__body">
            {SMOAC_PROFILE_WELCOME.lead}
          </p>
          <p className="dashboard-modal__body dashboard-modal__body--welcome-trial">
            {SMOAC_PROFILE_WELCOME.trial}
          </p>
          <DashboardButton
            className="dashboard-pro-upgrade-btn"
            onClick={onStartWithPhotos}
          >
            {SMOAC_PROFILE_WELCOME.primaryCta}
          </DashboardButton>
          <FastActivateButton
            className="dashboard-modal__secondary"
            onActivate={onClose}
          >
            {SMOAC_PROFILE_WELCOME.secondaryCta}
          </FastActivateButton>
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}
