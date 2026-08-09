"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";

/**
 * Instant soft-nav feedback while the profile sheet resolves from
 * in-memory catalog (or a rare cold fetch).
 */
export function TrainerProfileSheetSkeleton() {
  const hydrated = useHydrated();
  const isSheetViewport = useTabletViewport(true);

  useEffect(() => {
    if (!isSheetViewport) return;
    document.body.classList.add("profile-sheet-open");
    document.documentElement.classList.add("profile-sheet-open");
    return () => {
      document.body.classList.remove("profile-sheet-open");
      document.documentElement.classList.remove("profile-sheet-open");
    };
  }, [isSheetViewport]);

  if (!isSheetViewport) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-white/60">
        Loading specialist profile…
      </div>
    );
  }

  if (!hydrated || typeof document === "undefined") {
    return <div className="profile-sheet-ssr" aria-busy="true" />;
  }

  return createPortal(
    <div className="profile-sheet-root" role="presentation" aria-busy="true">
      <div className="profile-sheet__backdrop" aria-hidden />
      <div
        className="profile-sheet profile-sheet--skeleton"
        role="dialog"
        aria-modal="true"
        aria-label="Loading specialist profile"
      >
        <div className="profile-sheet__chrome">
          <div className="profile-sheet__handle" aria-hidden />
        </div>
        <div className="profile-sheet__skeleton-body">
          <div className="profile-sheet__skeleton-hero" />
          <div className="profile-sheet__skeleton-line" />
          <div className="profile-sheet__skeleton-line profile-sheet__skeleton-line--short" />
        </div>
      </div>
    </div>,
    document.body
  );
}
