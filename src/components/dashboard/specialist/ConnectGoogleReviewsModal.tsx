"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SmoacSavingOverlay } from "@/components/brand/SmoacSavingMark";
import { CloseIcon } from "@/components/ui/icons";
import { DashboardButton } from "@/components/dashboard/shared";
import type { GooglePlaceSnapshot } from "@/lib/google-places";

interface ConnectGoogleReviewsModalProps {
  open: boolean;
  onClose: () => void;
  onConnected: (snapshot: GooglePlaceSnapshot) => void;
}

export function ConnectGoogleReviewsModal({
  open,
  onClose,
  onConnected,
}: ConnectGoogleReviewsModalProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, busy]);

  useEffect(() => {
    if (!open) {
      setValue("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/specialist/google-reviews/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ placeIdOrUrl: trimmed }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        snapshot?: GooglePlaceSnapshot;
      } | null;
      if (!response.ok || !payload?.ok || !payload.snapshot) {
        setError(payload?.message || "Could not connect Google Reviews.");
        return;
      }
      onConnected(payload.snapshot);
      onClose();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="dashboard-modal"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="dashboard-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-google-title"
        aria-describedby="connect-google-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <button
          type="button"
          className="dashboard-modal__close"
          onClick={onClose}
          aria-label="Close"
          disabled={busy}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <div className="dashboard-modal__content">
          <p className="dashboard-modal__eyebrow">SMOAC Pro</p>
          <h2 id="connect-google-title" className="dashboard-modal__title">
            Connect Google Reviews
          </h2>
          <p id="connect-google-desc" className="dashboard-modal__body">
            Paste your Google Place ID (starts with ChIJ…) or a Maps link with{" "}
            <code>place_id=</code>. Your live rating and count appear under SMOAC
            stars — full reviews open on Google.
          </p>
          <form
            className="dashboard-connect-google-form"
            onSubmit={(e) => void handleSubmit(e)}
          >
            <label className="login-field">
              <span className="login-field__label">Place ID or Maps link</span>
              <input
                className="login-field__input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="ChIJ… or https://maps.google.com/?place_id=…"
                autoComplete="off"
                disabled={busy}
              />
            </label>
            {error ? (
              <p className="dashboard-connect-google-form__error" role="alert">
                {error}
              </p>
            ) : null}
            <DashboardButton type="submit" disabled={busy || !value.trim()}>
              {busy ? "Connecting…" : "Connect Google Reviews"}
            </DashboardButton>
          </form>
        </div>
        {busy ? (
          <SmoacSavingOverlay label="Connecting Google Reviews" />
        ) : null}
      </div>
    </div>,
    document.body
  );
}
