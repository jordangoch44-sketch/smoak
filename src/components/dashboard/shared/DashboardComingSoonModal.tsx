"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { DashboardButton } from "./DashboardButton";

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
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        aria-describedby="dashboard-modal-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal__glow" aria-hidden />

        <button
          type="button"
          className="dashboard-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

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
    </div>,
    document.body
  );
}
