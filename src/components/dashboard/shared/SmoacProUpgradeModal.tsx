"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { SMOAC_PRO_UPGRADE_MODAL } from "@/lib/specialist-premium";
import { DashboardButton } from "./DashboardButton";

interface SmoacProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function SmoacProUpgradeModal({ open, onClose }: SmoacProUpgradeModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setError(null);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout is not available yet.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--pro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="smoac-pro-modal-title"
        aria-describedby="smoac-pro-modal-desc"
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
          <p className="dashboard-modal__eyebrow">{SMOAC_PRO_UPGRADE_MODAL.eyebrow}</p>
          <h2 id="smoac-pro-modal-title" className="dashboard-modal__title">
            {SMOAC_PRO_UPGRADE_MODAL.title}
          </h2>
          <p id="smoac-pro-modal-desc" className="dashboard-modal__body">
            {SMOAC_PRO_UPGRADE_MODAL.description}
          </p>
          <p className="dashboard-modal__price">{SMOAC_PRO_UPGRADE_MODAL.price}</p>
          <p className="dashboard-modal__note">{SMOAC_PRO_UPGRADE_MODAL.note}</p>
          {error ? (
            <p className="dashboard-modal__error" role="alert">
              {error}
            </p>
          ) : null}
          <DashboardButton
            className="dashboard-pro-upgrade-btn"
            onClick={() => void startCheckout()}
            disabled={busy}
          >
            {busy ? "Opening checkout…" : "Start free month"}
          </DashboardButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
