"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { DashboardButton } from "./DashboardButton";

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
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--signout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-signout-title"
        aria-describedby="dashboard-signout-desc"
        onClick={(event) => event.stopPropagation()}
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
            <button
              type="button"
              className="smoac-control dashboard-modal__cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <DashboardButton onClick={onConfirm}>Sign out</DashboardButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
