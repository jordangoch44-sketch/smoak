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
            Welcome — your specialist profile is now under review by the SMOAC
            team.
            {emailSent
              ? " We also emailed you a welcome note confirming we received your application."
              : " If you don’t see a welcome email soon, check spam — we’ll still email you when you’re approved."}
          </p>
        </header>

        <p className="wizard-submitted-modal__note">
          Typical review is within 24 hours. Opening your pending dashboard
          next so you can review what you submitted while you wait. After
          approval, finish your full listing from Edit profile.
        </p>

        <footer className="wizard-incomplete-modal__footer">
          <button
            type="button"
            className="login-submit wizard-nav__continue wizard-incomplete-modal__btn"
            onClick={onContinue}
          >
            Open pending dashboard
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
