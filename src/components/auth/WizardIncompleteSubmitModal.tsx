"use client";

import { createPortal } from "react-dom";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";

export interface WizardIncompleteSubmitModalProps {
  open: boolean;
  missingLabels: string[];
  submitting?: boolean;
  onGoBack: () => void;
  onSubmitAnyway: () => void;
}

export function WizardIncompleteSubmitModal({
  open,
  missingLabels,
  submitting = false,
  onGoBack,
  onSubmitAnyway,
}: WizardIncompleteSubmitModalProps) {
  useBlockingModalOpen(open);

  if (!open) return null;

  const sheet = (
    <div
      className="wizard-incomplete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-incomplete-title"
    >
      <button
        type="button"
        className="wizard-incomplete-modal__backdrop"
        aria-label="Close"
        onClick={onGoBack}
      />
      <div className="wizard-incomplete-modal__panel">
        <header className="wizard-incomplete-modal__header">
          <h2 id="wizard-incomplete-title" className="wizard-incomplete-modal__title">
            Some information is missing
          </h2>
          <p className="wizard-incomplete-modal__lead">
            You can go back to complete these items, or submit your application for
            review as-is.
          </p>
        </header>

        <ul className="wizard-incomplete-modal__list">
          {missingLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>

        <footer className="wizard-incomplete-modal__footer">
          <button
            type="button"
            className="wizard-nav__back wizard-incomplete-modal__btn"
            disabled={submitting}
            onClick={onGoBack}
          >
            Go back and edit
          </button>
          <button
            type="button"
            className="login-submit wizard-nav__continue wizard-incomplete-modal__btn"
            disabled={submitting}
            onClick={onSubmitAnyway}
          >
            {submitting ? "Submitting…" : "Submit anyway"}
          </button>
        </footer>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(sheet, document.body);
}
