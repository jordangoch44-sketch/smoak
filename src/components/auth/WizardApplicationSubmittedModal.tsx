"use client";

import { createPortal } from "react-dom";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";

export interface WizardApplicationSubmittedModalProps {
  open: boolean;
  emailSent?: boolean;
  onContinue: () => void;
}

export function WizardApplicationSubmittedModal({
  open,
  emailSent = false,
  onContinue,
}: WizardApplicationSubmittedModalProps) {
  useBlockingModalOpen(open);

  if (!open) return null;

  const sheet = (
    <div
      className="wizard-incomplete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-submitted-title"
    >
      <button
        type="button"
        className="wizard-incomplete-modal__backdrop"
        aria-label="Continue to your application"
        onClick={onContinue}
      />
      <div className="wizard-incomplete-modal__panel">
        <header className="wizard-incomplete-modal__header">
          <h2 id="wizard-submitted-title" className="wizard-incomplete-modal__title">
            Application submitted
          </h2>
          <p className="wizard-incomplete-modal__lead">
            Your specialist profile is now under review by the SMOAC team.
            {emailSent
              ? " Check your email for a confirmation."
              : " You’ll get an email when you’re approved."}
          </p>
        </header>

        <p className="wizard-submitted-modal__note">
          Typical review time is within 24 hours. After approval, log in and open
          Edit profile to finish your in-depth listing — pricing, availability,
          photos, and more.
        </p>

        <footer className="wizard-incomplete-modal__footer">
          <button
            type="button"
            className="login-submit wizard-nav__continue wizard-incomplete-modal__btn"
            onClick={onContinue}
          >
            Go to my application
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
