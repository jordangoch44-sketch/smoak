"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CloseIcon, HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const COMPLETE_PROFILE_HREF = "/create-account?role=client";

export interface SaveSuccessModalProps {
  open: boolean;
  onClose: () => void;
  specialistName?: string;
}

export function SaveSuccessModal({
  open,
  onClose,
  specialistName,
}: SaveSuccessModalProps) {
  useEffect(() => {
    if (!open) return;

    document.body.classList.add("login-gate-open");
    document.documentElement.classList.add("login-gate-open");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("login-gate-open");
      document.documentElement.classList.remove("login-gate-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="login-gate" role="presentation" onClick={onClose}>
      <div
        className={cn("login-gate__dialog", "login-gate__dialog--save")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-success-title"
        aria-describedby="save-success-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="login-gate__glow" aria-hidden />

        <button
          type="button"
          className="smoac-control login-gate__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="login-gate__content login-gate__content--save">
          <div className="login-gate__success-icon" aria-hidden>
            <HeartIcon className="h-6 w-6" filled />
          </div>
          <h2 id="save-success-title" className="login-gate__title">
            Specialist saved
          </h2>
          <p id="save-success-desc" className="login-gate__body">
            Your account is ready. You can add more details to your profile whenever
            you’re ready.
          </p>
          <p className="login-gate__saved-detail">
            Saved to your Favorites
            {specialistName ? ` · ${specialistName}` : ""}
          </p>

          <div className="login-gate__actions">
            <button
              type="button"
              className="smoac-control login-gate__btn login-gate__btn--aurora"
              onClick={onClose}
            >
              Continue browsing
            </button>
            <Link
              href={COMPLETE_PROFILE_HREF}
              className="smoac-control login-gate__btn login-gate__btn--ghost"
              onClick={onClose}
            >
              Complete my profile
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
