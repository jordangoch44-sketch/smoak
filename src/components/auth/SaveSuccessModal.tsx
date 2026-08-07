"use client";

import { useEffect, useRef } from "react";
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
  const closingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      closingRef.current = false;
      return;
    }

    document.body.classList.add("login-gate-open");
    document.documentElement.classList.add("login-gate-open");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismissNow();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("login-gate-open");
      document.documentElement.classList.remove("login-gate-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  function dismissNow(target: EventTarget | null = null) {
    if (closingRef.current) return;
    closingRef.current = true;
    const el =
      (target instanceof Element ? target.closest(".login-gate") : null) ??
      document.querySelector(".login-gate");
    if (el instanceof HTMLElement) {
      el.setAttribute("aria-hidden", "true");
      el.classList.add("login-gate--dismissed");
    }
    document.body.classList.remove("login-gate-open");
    document.documentElement.classList.remove("login-gate-open");
    requestAnimationFrame(() => onClose());
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="login-gate"
      role="presentation"
      onPointerUp={(event) => {
        if (event.target !== event.currentTarget) return;
        dismissNow(event.currentTarget);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        dismissNow(event.currentTarget);
      }}
    >
      <div
        className={cn("login-gate__dialog", "login-gate__dialog--save")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-success-title"
        aria-describedby="save-success-desc"
        onClick={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="login-gate__glow" aria-hidden />

        <button
          type="button"
          className="smoac-control login-gate__close"
          aria-label="Close"
          onPointerUp={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            dismissNow(event.currentTarget);
          }}
          onClick={(event) => dismissNow(event.currentTarget)}
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
              onClick={() => dismissNow()}
            >
              Continue browsing
            </button>
            <Link
              href={COMPLETE_PROFILE_HREF}
              className="smoac-control login-gate__btn login-gate__btn--ghost"
              onClick={() => dismissNow()}
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
