"use client";

import { useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SaveTrainerButton } from "@/components/trainers/SaveTrainerButton";
import { useToast } from "@/components/ui/toast";
import { resolveInstagramProfileUrl } from "@/lib/instagram-profile-url";
import { shareTrainerProfile } from "@/lib/profile-share";
import { navigateToProfileSheetReturn } from "@/lib/profile-sheet-return";
import { cn } from "@/lib/utils";
import { useProfileSheetDismiss } from "./ProfileSheetDismissContext";
import { useProfileSheetToolbarHost } from "./ProfileSheetToolbarHostContext";

interface ProfileHeroToolbarProps {
  trainerId: string;
  trainerName: string;
  instagram?: string | null;
}

function ToolbarIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={cn("profile-toolbar__icon", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function ProfileHeroToolbar({
  trainerId,
  trainerName,
  instagram,
}: ProfileHeroToolbarProps) {
  const router = useRouter();
  const sheetDismiss = useProfileSheetDismiss();
  const toolbarHost = useProfileSheetToolbarHost();
  const sheetHostEl = toolbarHost?.hostEl ?? null;
  const { showToast } = useToast();
  const instagramHref = resolveInstagramProfileUrl(instagram);
  const instagramGradId = useId().replace(/:/g, "");
  const canPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  function handleClose() {
    if (sheetDismiss) {
      sheetDismiss();
      return;
    }
    navigateToProfileSheetReturn(router);
  }

  async function handleShare() {
    try {
      const result = await shareTrainerProfile({ trainerId, trainerName });
      showToast({
        type: "success",
        message:
          result === "shared"
            ? "Profile shared."
            : "Profile link copied to clipboard.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast({
        type: "info",
        message: "Could not share this profile.",
      });
    }
  }

  if (!canPortal) return null;

  const toolbar = (
    <div
      className={cn(
        "profile-toolbar",
        Boolean(sheetHostEl) && "profile-toolbar--in-sheet"
      )}
      aria-hidden={false}
    >
      <button
        type="button"
        className="profile-toolbar__close"
        aria-label="Close profile"
        onClick={handleClose}
      >
        <ToolbarIcon className="profile-toolbar__icon--close">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </ToolbarIcon>
      </button>

      <div className="profile-toolbar__actions">
        <div
          className="profile-toolbar__bar"
          role="toolbar"
          aria-label="Profile actions"
        >
          <div className="profile-toolbar__save" data-save-control>
            <SaveTrainerButton trainerId={trainerId} overlay={false} />
          </div>

          <button
            type="button"
            className="profile-toolbar__btn"
            aria-label="Share profile"
            onClick={handleShare}
          >
            <ToolbarIcon>
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M12 3v12" />
              <path d="m7 8 5-5 5 5" />
            </ToolbarIcon>
          </button>

          {instagramHref ? (
            <a
              href={instagramHref}
              className="profile-toolbar__btn profile-toolbar__btn--instagram"
              aria-label={`${trainerName} on Instagram`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="profile-toolbar__icon profile-toolbar__icon--instagram"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <defs>
                  <radialGradient
                    id={instagramGradId}
                    cx="30%"
                    cy="107%"
                    r="150%"
                  >
                    <stop offset="0%" stopColor="#fdf497" />
                    <stop offset="5%" stopColor="#fdf497" />
                    <stop offset="45%" stopColor="#fd5949" />
                    <stop offset="60%" stopColor="#d6249f" />
                    <stop offset="90%" stopColor="#285AEB" />
                  </radialGradient>
                </defs>
                <path
                  fill={`url(#${instagramGradId})`}
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
                />
              </svg>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );

  /* Sheet mode: portal into the animated sheet so X/actions exit with it.
   * Fall back to document.body until the host node is mounted — never blank
   * the chrome on slow mobile navigations. */
  if (toolbarHost) {
    return createPortal(toolbar, sheetHostEl ?? document.body);
  }

  /* Desktop full-page profile: keep fixed viewport chrome. */
  return createPortal(toolbar, document.body);
}
