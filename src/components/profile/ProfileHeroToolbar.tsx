"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SaveTrainerButton } from "@/components/trainers/SaveTrainerButton";
import { useToast } from "@/components/ui/toast";
import { useHiddenTrainers } from "@/hooks/useHiddenTrainers";
import {
  copyTrainerProfileLink,
  scrollToProfileConsultation,
  shareTrainerProfile,
} from "@/lib/profile-share";
import { cn } from "@/lib/utils";
import { useProfileSheetDismiss } from "./ProfileSheetDismissContext";
import { useProfileSheetToolbarHost } from "./ProfileSheetToolbarHostContext";

const EXPLORE_FALLBACK_PATH = "/explore";

interface ProfileHeroToolbarProps {
  trainerId: string;
  trainerName: string;
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
}: ProfileHeroToolbarProps) {
  const router = useRouter();
  const sheetDismiss = useProfileSheetDismiss();
  const toolbarHostRef = useProfileSheetToolbarHost();
  const { showToast } = useToast();
  const { isHidden, toggleHidden } = useHiddenTrainers();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetHostEl, setSheetHostEl] = useState<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const hidden = isHidden(trainerId);
  const canPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  /* Resolve sheet host after mount — ref is set by TrainerProfileSheet. */
  useEffect(() => {
    if (!toolbarHostRef) {
      setSheetHostEl(null);
      return;
    }
    setSheetHostEl(toolbarHostRef.current);
    const id = window.requestAnimationFrame(() => {
      setSheetHostEl(toolbarHostRef.current);
    });
    return () => window.cancelAnimationFrame(id);
  }, [toolbarHostRef]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, closeMenu]);

  function handleClose() {
    const t0 = performance.now();
    console.info("[close-timing] profile toolbar X click", t0);
    closeMenu();
    if (sheetDismiss) {
      sheetDismiss();
      console.info(
        "[close-timing] profile toolbar sheetDismiss returned",
        performance.now(),
        "Δms",
        Math.round(performance.now() - t0)
      );
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(EXPLORE_FALLBACK_PATH);
  }

  async function handleShare() {
    closeMenu();
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

  async function handleCopyLink() {
    closeMenu();
    try {
      await copyTrainerProfileLink(trainerId);
      showToast({
        type: "success",
        message: "Profile link copied.",
      });
    } catch {
      showToast({
        type: "info",
        message: "Could not copy the profile link.",
      });
    }
  }

  function handleHide() {
    closeMenu();
    const nowHidden = toggleHidden(trainerId);
    if (nowHidden) {
      showToast({
        type: "info",
        message: `${trainerName} hidden from Explore.`,
      });
      router.push(EXPLORE_FALLBACK_PATH);
      return;
    }
    showToast({
      type: "success",
      message: `${trainerName} will appear in Explore again.`,
    });
  }

  function handleReport() {
    closeMenu();
    showToast({
      type: "info",
      message: "Thanks — our team will review this profile.",
    });
  }

  function handleContact() {
    closeMenu();
    scrollToProfileConsultation();
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

      <div
        ref={actionsRef}
        className="profile-toolbar__actions"
        data-menu-open={menuOpen ? "true" : "false"}
      >
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

          <button
            type="button"
            className={cn(
              "profile-toolbar__btn",
              hidden && "profile-toolbar__btn--active"
            )}
            aria-label={hidden ? "Show in Explore" : "Hide from Explore"}
            aria-pressed={hidden}
            onClick={handleHide}
          >
            <ToolbarIcon>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M1 1l22 22" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            </ToolbarIcon>
          </button>

          <button
            type="button"
            className={cn(
              "profile-toolbar__btn profile-toolbar__btn--more",
              menuOpen && "profile-toolbar__btn--active"
            )}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <ToolbarIcon>
              <circle cx="5" cy="12" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
            </ToolbarIcon>
          </button>
        </div>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            className="profile-toolbar__menu"
            aria-label="More profile actions"
          >
            <button
              type="button"
              role="menuitem"
              className="profile-toolbar__menu-item"
              onClick={handleReport}
            >
              Report profile
            </button>
            <button
              type="button"
              role="menuitem"
              className="profile-toolbar__menu-item"
              onClick={handleCopyLink}
            >
              Copy profile link
            </button>
            <button
              type="button"
              role="menuitem"
              className="profile-toolbar__menu-item"
              onClick={handleContact}
            >
              Contact specialist
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  /* Sheet mode: portal into the animated sheet so X/actions exit with it. */
  if (toolbarHostRef) {
    if (!sheetHostEl) return null;
    return createPortal(toolbar, sheetHostEl);
  }

  /* Desktop full-page profile: keep fixed viewport chrome. */
  return createPortal(toolbar, document.body);
}
