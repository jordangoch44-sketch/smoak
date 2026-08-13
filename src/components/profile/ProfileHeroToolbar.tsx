"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SaveTrainerButton } from "@/components/trainers/SaveTrainerButton";
import { useToast } from "@/components/ui/toast";
import { resolveInstagramProfileUrl } from "@/lib/instagram-profile-url";
import { shareTrainerProfile } from "@/lib/profile-share";
import { cn } from "@/lib/utils";
import { useProfileSheetDismiss } from "./ProfileSheetDismissContext";
import { useProfileSheetToolbarHost } from "./ProfileSheetToolbarHostContext";

const EXPLORE_FALLBACK_PATH = "/explore";

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
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(EXPLORE_FALLBACK_PATH);
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
              className="profile-toolbar__btn"
              aria-label={`${trainerName} on Instagram`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ToolbarIcon>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
              </ToolbarIcon>
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
