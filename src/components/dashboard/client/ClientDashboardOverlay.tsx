"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import "@/styles/inquiry-thread.css";

const PAGE_LOCK_CLASS = "inquiry-inbox-open";

interface ClientDashboardOverlayProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
  padded?: boolean;
}

export function ClientDashboardOverlay({
  title,
  onBack,
  children,
  padded = false,
}: ClientDashboardOverlayProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add(PAGE_LOCK_CLASS);
    document.documentElement.classList.add(PAGE_LOCK_CLASS);
    const unlock = lockOverlayDocumentScroll();
    return () => {
      unlock();
      document.body.classList.remove(PAGE_LOCK_CLASS);
      document.documentElement.classList.remove(PAGE_LOCK_CLASS);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="inquiry-inbox-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="inquiry-inbox-page__chrome">
        <FastActivateButton
          className="smoac-control inquiry-inbox-page__back"
          aria-label="Back to profile"
          onActivate={onBack}
        >
          <ChevronLeftIcon className="inquiry-inbox-page__back-icon" />
        </FastActivateButton>
        <h1 id={titleId} className="inquiry-inbox-page__title">
          {title}
        </h1>
        <span className="inquiry-inbox-page__select-spacer" aria-hidden />
      </header>
      <div
        className={
          padded
            ? "inquiry-inbox-page__body client-dash-overlay__body"
            : "inquiry-inbox-page__body"
        }
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
