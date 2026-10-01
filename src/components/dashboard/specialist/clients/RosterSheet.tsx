"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import "@/styles/client-workouts.css";

/** Shares the workouts overlay lock so the iOS scroll rules and stale-class scrub apply. */
const LOCK_CLASS = "client-workouts-open";

/** Bottom sheet used by the Clients tab (add client, send workout, client plan). */
export function RosterSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const backdropDismiss = useOwnPointerDismiss(onClose);

  useEffect(() => {
    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    const unlock = lockOverlayDocumentScroll();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      unlock();
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
    };
  }, [onClose]);

  return createPortal(
    <div className="client-workouts-root" role="presentation">
      <button
        type="button"
        className="client-workouts-root__backdrop"
        aria-label={`Close ${title}`}
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div
        className="client-weight-sheet roster-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="client-workouts-dialog__handle" aria-hidden />
        <div className="client-weight-sheet__top">
          <div className="roster-sheet__heading">
            <h2 id={titleId} className="client-workouts-dialog__title">
              {title}
            </h2>
            {subtitle ? <p className="roster-sheet__subtitle">{subtitle}</p> : null}
          </div>
          <FastActivateButton
            className="client-workouts-dialog__close"
            aria-label="Close"
            onActivate={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
