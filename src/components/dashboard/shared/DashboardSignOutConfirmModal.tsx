"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalScrim,
} from "./DashboardModalScrim";

interface DashboardSignOutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Centered confirm before signing out of a dashboard session. */
export function DashboardSignOutConfirmModal({
  open,
  onClose,
  onConfirm,
}: DashboardSignOutConfirmModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <DashboardModalScrim onDismiss={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--signout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-signout-title"
        aria-describedby="dashboard-signout-desc"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow" aria-hidden />

        <div className="dashboard-modal__content">
          <h2 id="dashboard-signout-title" className="dashboard-modal__title">
            Sign out?
          </h2>
          <p id="dashboard-signout-desc" className="dashboard-modal__body">
            Are you sure you want to sign out?
          </p>
          <div className="dashboard-modal__actions">
            <FastActivateButton
              className="smoac-control dashboard-modal__cancel"
              onActivate={onClose}
            >
              Cancel
            </FastActivateButton>
            <DashboardButton onClick={onConfirm}>Sign out</DashboardButton>
          </div>
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}
