"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import { SMOAC_PRO_TRIAL_CONFIRM_MODAL } from "@/lib/specialist-premium";
import { showToast } from "@/lib/toast-store";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";
import {
  UpgradeCta,
  UpgradeFooter,
  UpgradeMark,
  UpgradePerkList,
  UpgradeTitleText,
} from "./SmoacProUpgradeModal";

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

    document.body.classList.add(MODAL_OPEN_BODY_CLASS);
    document.documentElement.classList.add(MODAL_OPEN_BODY_CLASS);
    setError(null);
    setBusy(false);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
      document.documentElement.classList.remove(MODAL_OPEN_BODY_CLASS);
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

  const copy = SMOAC_PRO_TRIAL_CONFIRM_MODAL;

  return createPortal(
    <DashboardModalScrim
      className="dashboard-modal--upgrade dashboard-modal--upgrade-trial"
      onDismiss={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--pro dashboard-modal__dialog--upgrade dashboard-modal__dialog--upgrade-trial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-trial-confirm-title"
        aria-describedby="pro-trial-confirm-desc"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div
          className="dashboard-modal__glow dashboard-upgrade__glow dashboard-upgrade__glow--trial"
          aria-hidden
        />

        <DashboardModalCloseButton onClose={onClose} disabled={busy} />

        <div className="dashboard-modal__content dashboard-upgrade-content">
          <div className="dashboard-upgrade">
            <div className="dashboard-upgrade__hero">
              <UpgradeMark />
              <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
                {copy.eyebrow}
              </p>
              <h2 id="pro-trial-confirm-title" className="dashboard-upgrade__title">
                <UpgradeTitleText title={copy.title} />
              </h2>
              <p id="pro-trial-confirm-desc" className="dashboard-upgrade__body">
                {copy.description}
              </p>
            </div>

            <UpgradePerkList benefits={copy.benefits} />

            <p className="dashboard-modal__note">{copy.note}</p>

            {error ? (
              <p className="dashboard-modal__error" role="alert">
                {error}
              </p>
            ) : null}

            <UpgradeCta busy={busy} onClick={() => void confirmStartTrial()}>
              {busy ? "Starting trial…" : copy.primaryCta}
            </UpgradeCta>

            <FastActivateButton
              className="dashboard-modal__secondary"
              onActivate={onClose}
              disabled={busy}
            >
              {copy.secondaryCta}
            </FastActivateButton>
            <UpgradeFooter />
          </div>
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}
