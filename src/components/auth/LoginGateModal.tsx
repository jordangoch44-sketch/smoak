"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { cn } from "@/lib/utils";

export { CREATE_ACCOUNT_PATH } from "@/lib/join-flow";

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginGateModal({ open, onClose }: LoginGateModalProps) {
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
    <div
      className="login-gate"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={cn("login-gate__dialog")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-gate-title"
        aria-describedby="login-gate-desc"
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

        <div className="login-gate__content">
          <h2 id="login-gate-title" className="login-gate__title">
            Save this specialist to your shortlist.
          </h2>
          <p id="login-gate-desc" className="login-gate__body">
            Log in or create a free account to save specialists, compare
            profiles, and manage inquiries.
          </p>

          <div className="login-gate__actions">
            <Link
              href={LOGIN_PATH}
              className="smoac-control login-gate__btn login-gate__btn--primary"
              onClick={onClose}
            >
              Log in
            </Link>
            <Link
              href={buildJoinFlowHref()}
              className="smoac-control login-gate__btn login-gate__btn--secondary"
              onClick={onClose}
            >
              Create account
            </Link>
            <button
              type="button"
              className="smoac-control login-gate__btn login-gate__btn--ghost"
              onClick={onClose}
            >
              Continue browsing
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
