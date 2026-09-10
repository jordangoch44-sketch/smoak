"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";

interface DashboardComingSoonModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

export function DashboardComingSoonModal({
  open,
  title,
  description,
  onClose,
}: DashboardComingSoonModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <DashboardModalScrim onDismiss={onClose}>
      <div
        className="dashboard-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        aria-describedby="dashboard-modal-desc"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow" aria-hidden />

        <DashboardModalCloseButton onClose={onClose} />

        <div className="dashboard-modal__content">
          <p className="dashboard-modal__eyebrow">Coming soon</p>
          <h2 id="dashboard-modal-title" className="dashboard-modal__title">
            {title}
          </h2>
          <p id="dashboard-modal-desc" className="dashboard-modal__body">
            {description}
          </p>
          <DashboardButton onClick={onClose}>Got it</DashboardButton>
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}
