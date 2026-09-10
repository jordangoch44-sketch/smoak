"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SMOAC_PRO_TRIAL_CONFIRM_MODAL } from "@/lib/specialist-premium";
import { showToast } from "@/lib/toast-store";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";

interface SmoacProTrialConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onStarted?: () => void;
}

/**
 * Benefits + confirm before claiming the one-time free Pro trial.
 */
export function SmoacProTrialConfirmModal({
  open,
  onClose,
  onStarted,
}: SmoacProTrialConfirmModalProps) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setError(null);
    setBusy(false);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, busy]);

  async function confirmStartTrial() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/specialist/claim-premium-trial", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        granted?: boolean;
        alreadyUsed?: boolean;
        message?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Could not start free Pro trial.");
        return;
      }

      await refreshSession();
      showToast({
        type: "success",
        message:
          data.message ??
          (data.granted
            ? "Pro unlocked for 30 days — no card required."
            : "Your free Pro month was already claimed."),
      });
      onStarted?.();
      onClose();
      router.refresh();
    } catch {
      setError("Could not start free Pro trial. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <DashboardModalScrim
      onDismiss={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--pro-trial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-trial-confirm-title"
        aria-describedby="pro-trial-confirm-desc"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow dashboard-modal__glow--neon" aria-hidden />

        <DashboardModalCloseButton onClose={onClose} disabled={busy} />

        <div className="dashboard-modal__content">
          <p className="dashboard-modal__eyebrow dashboard-modal__eyebrow--neon">
            {SMOAC_PRO_TRIAL_CONFIRM_MODAL.eyebrow}
          </p>
          <h2 id="pro-trial-confirm-title" className="dashboard-modal__title">
            {SMOAC_PRO_TRIAL_CONFIRM_MODAL.title}
          </h2>
          <p id="pro-trial-confirm-desc" className="dashboard-modal__body">
            {SMOAC_PRO_TRIAL_CONFIRM_MODAL.description}
          </p>

          <ul className="dashboard-pro-trial-benefits">
            {SMOAC_PRO_TRIAL_CONFIRM_MODAL.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>

          <p className="dashboard-modal__note">
            {SMOAC_PRO_TRIAL_CONFIRM_MODAL.note}
          </p>

          {error ? (
            <p className="dashboard-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <DashboardButton
            className="dashboard-pro-trial-confirm-btn"
            onClick={() => void confirmStartTrial()}
            disabled={busy}
          >
            {busy
              ? "Starting trial…"
              : SMOAC_PRO_TRIAL_CONFIRM_MODAL.primaryCta}
          </DashboardButton>

          <FastActivateButton
            className="dashboard-modal__secondary"
            onActivate={onClose}
            disabled={busy}
          >
            {SMOAC_PRO_TRIAL_CONFIRM_MODAL.secondaryCta}
          </FastActivateButton>
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}
