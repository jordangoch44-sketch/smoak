"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { useHydrated } from "@/hooks/useHydrated";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { restoreListingPointerAccess } from "@/lib/chrome-body-classes";
import { clearDesktopProfilePopup } from "@/lib/desktop-profile-popup";
import { isTrainerProfilePath } from "@/lib/motion";
import { navigateToProfileSheetReturn } from "@/lib/profile-sheet-return";
import { ProfileSheetDismissProvider } from "./ProfileSheetDismissContext";
import {
  ProfileSheetToolbarHostProvider,
  useProfileSheetToolbarHost,
} from "./ProfileSheetToolbarHostContext";

/**
 * Compositor slide. JS tweens dropped frames while the profile painted.
 * Durations match `.profile-sheet--to` / `.profile-sheet--dismiss`.
 */
const OPEN_MS = 500;
const DISMISS_MS = 360;
type SheetMotion = "from" | "to" | "dismiss" | "rest";

interface TrainerProfileSheetProps {
  children: ReactNode;
  label?: string;
  /** Specialist id — used to reset sheet scroll when Picks swap in-place. */
  trainerId?: string;
  /** Soft-nav from a listing — cover the still-mounted previous page on desktop. */
  intercept?: boolean;
}

/**
 * Which sheet instance currently owns listing chrome (`inert` / body class).
 * An older unmount must not unlock a newer open — that left Marketplace
 * cards with a stuck `inert` app-main after a few open/close cycles.
 */
let sheetChromeLockOwner = 0;

function lockSheetChrome(): number {
  document.body.classList.add("profile-sheet-open");
  document.documentElement.classList.add("profile-sheet-open");
  document.body.classList.remove("profile-sheet-dismissing", "profile-sheet-covered");
  document.querySelector(".app-main")?.setAttribute("inert", "");
  sheetChromeLockOwner += 1;
  return sheetChromeLockOwner;
}

/** Sheet fully covers the page — safe to hide Search / map / header paint. */
function markSheetCovered(owner: number) {
  if (owner !== sheetChromeLockOwner) return;
  document.body.classList.add("profile-sheet-covered");
}

/**
 * Start a tween only after the restyle from lock/unlock has painted, so the
 * first animation frames are not dropped (reads as a jump on iOS).
 */
function afterNextPaint(callback: () => void): () => void {
  let second = 0;
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(callback);
  });
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
  };
}

function unlockSheetChrome(owner?: number) {
  if (owner != null && owner !== sheetChromeLockOwner) return;
  document.body.classList.remove("profile-sheet-open", "profile-sheet-covered");
  document.documentElement.classList.remove("profile-sheet-open");
  document.querySelector(".app-main")?.removeAttribute("inert");
  restoreListingPointerAccess({ forceNudge: true });
}

function markSheetDismissing() {
  document.body.classList.add("profile-sheet-dismissing");
}

function clearSheetDismissing(owner?: number) {
  if (owner != null && owner !== sheetChromeLockOwner) return;
  document.body.classList.remove("profile-sheet-dismissing");
}

/**
 * Mobile/tablet: bottom sheet over the still-mounted previous page
 * (`@modal` intercept). Close via X / backdrop / Escape / browser back.
 * No swipe-drag dismissal — one unified slide-down exit.
 * Desktop intercept: thinner centered popup over Search.
 */
export function TrainerProfileSheet({
  children,
  label = "Specialist profile",
  trainerId,
  intercept = false,
}: TrainerProfileSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const isSheetViewport = useTabletViewport(true);
  const reduceMotion = useReducedMotion();
  const onProfilePath = isTrainerProfilePath(pathname);
  const overlayActive = !intercept || onProfilePath;
  const lockOwnerRef = useRef(0);
  const wasOnProfilePathRef = useRef(onProfilePath);
  /* True while the sheet is translating. At rest we drop the transform so
   * iOS hit-tests the X / heart / tabs / photos (transformed overlays swallow taps). */
  const [sheetMoving, setSheetMoving] = useState(true);
  /* Off-screen until the first paint, then a CSS transform transition. */
  const [motionPhase, setMotionPhase] = useState<SheetMotion>("from");
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissingRef = useRef(false);
  const finishOnceRef = useRef(false);
  const openAnimRef = useRef<{ stop: () => void } | null>(null);
  const programmaticNavRef = useRef(false);
  const dismissFinishRef = useRef<(() => void) | null>(null);
  const motionPhaseRef = useRef<SheetMotion>("from");
  motionPhaseRef.current = motionPhase;
  /** Drop portal DOM after slide so soft-nav cannot leave a stuck strip. */
  const [exited, setExited] = useState(false);

  const navigateAway = useCallback(() => {
    programmaticNavRef.current = true;
    navigateToProfileSheetReturn(router);
  }, [router]);

  const runDismissAnimation = useCallback(
    (options: { navigate: boolean }) => {
      openAnimRef.current?.stop();
      openAnimRef.current = null;
      setSheetMoving(true);

      /*
       * Restore site chrome immediately. Soft-nav can keep this tree mounted
       * for seconds after the slide; waiting for animation/unmount left the
       * bottom nav and header missing for 10s+.
       */
      unlockSheetChrome(lockOwnerRef.current);
      markSheetDismissing();
      const root = rootRef.current;
      root?.classList.add(
        "profile-sheet-root--pass-through",
        "profile-sheet-root--dismissing"
      );
      root?.setAttribute("inert", "");

      finishOnceRef.current = false;
      const finish = () => {
        if (finishOnceRef.current) return;
        finishOnceRef.current = true;
        dismissFinishRef.current = null;
        clearSheetDismissing(lockOwnerRef.current);
        root?.classList.add("profile-sheet-root--exited");
        /* Unmount portal before/while soft-nav clears @modal — prevents
         * a 1‑frame remnant strip under the bottom nav on iOS. */
        setExited(true);
        if (options.navigate) navigateAway();
      };

      /* Still off-screen — nothing to slide down. */
      if (reduceMotion || motionPhaseRef.current === "from") {
        finish();
        return;
      }

      dismissFinishRef.current = finish;
      /* Hold at the open position for one paint, then transition down.
       * Changing transform in the same frame the transition is added skips it. */
      setMotionPhase("to");
      const cancelStart = afterNextPaint(() => {
        if (!dismissingRef.current) return;
        setMotionPhase("dismiss");
      });
      openAnimRef.current = { stop: cancelStart };
    },
    [navigateAway, reduceMotion]
  );

  const dismiss = useCallback(() => {
    if (dismissingRef.current || exited) return;
    dismissingRef.current = true;
    runDismissAnimation({ navigate: true });
  }, [exited, runDismissAnimation]);
  const backdropDismiss = useOwnPointerDismiss(dismiss);

  useLayoutEffect(() => {
    if (isSheetViewport || !intercept || !overlayActive) return;
    clearDesktopProfilePopup();
    document.body.classList.add("profile-desktop-popup-open");
    document.documentElement.classList.add("profile-desktop-popup-open");
    return () => {
      document.body.classList.remove("profile-desktop-popup-open");
      document.documentElement.classList.remove("profile-desktop-popup-open");
    };
  }, [intercept, isSheetViewport, overlayActive]);

  /*
   * Next.js can keep `@modal` mounted after replace() back to Marketplace /
   * Search. If the URL is no longer a profile, drop the overlay and reset so
   * the next card tap can open again instead of looking like a dead tap.
   */
  useLayoutEffect(() => {
    const wasOnProfile = wasOnProfilePathRef.current;
    wasOnProfilePathRef.current = onProfilePath;

    if (!intercept) return;

    if (!onProfilePath) {
      dismissingRef.current = false;
      programmaticNavRef.current = false;
      if (!exited) setExited(true);
      unlockSheetChrome(lockOwnerRef.current);
      clearSheetDismissing(lockOwnerRef.current);
      restoreListingPointerAccess();
      return;
    }

    if (!wasOnProfile && (exited || dismissingRef.current)) {
      dismissingRef.current = false;
      finishOnceRef.current = false;
      programmaticNavRef.current = false;
      setMotionPhase("from");
      setSheetMoving(true);
      setExited(false);
    }
  }, [exited, intercept, onProfilePath, trainerId]);

  useLayoutEffect(() => {
    /* Direct /trainers/[slug] is a real page. The off-screen sheet is only
     * the soft-nav intercept, so crawlers are not left on a hidden shell. */
    if (!intercept || !isSheetViewport || !overlayActive) return;

    if (dismissingRef.current || exited) {
      const owner = lockOwnerRef.current;
      return () => {
        unlockSheetChrome(owner);
        clearSheetDismissing(owner);
      };
    }

    dismissingRef.current = false;
    finishOnceRef.current = false;
    programmaticNavRef.current = false;
    /* Fresh open — never keep a prior exit's pass-through / inert. */
    const root = rootRef.current;
    root?.classList.remove(
      "profile-sheet-root--pass-through",
      "profile-sheet-root--dismissing"
    );
    root?.removeAttribute("inert");
    lockOwnerRef.current = lockSheetChrome();
    const owner = lockOwnerRef.current;

    if (reduceMotion) {
      setMotionPhase("rest");
      setSheetMoving(false);
      markSheetCovered(owner);
    } else {
      setMotionPhase("from");
      setSheetMoving(true);
      /* Paint the off-screen sheet first so iOS does not drop the opening frames. */
      const cancelStart = afterNextPaint(() => {
        if (dismissingRef.current) return;
        setMotionPhase("to");
      });
      openAnimRef.current = { stop: cancelStart };
    }

    return () => {
      openAnimRef.current?.stop();
      openAnimRef.current = null;
      unlockSheetChrome(owner);
      clearSheetDismissing(owner);
    };
  }, [exited, intercept, isSheetViewport, overlayActive, reduceMotion]);

  /* CSS transition completion — compositor slide, so this only books the end. */
  useEffect(() => {
    if (!intercept || !isSheetViewport || reduceMotion) return;
    if (motionPhase !== "to" && motionPhase !== "dismiss") return;
    /* Dismiss parks on "to" for one frame. Don't treat that as the open landing. */
    if (motionPhase === "to" && dismissingRef.current) return;
    const sheet = rootRef.current?.querySelector(".profile-sheet");
    if (!(sheet instanceof HTMLElement)) return;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (motionPhase === "dismiss") {
        dismissFinishRef.current?.();
        dismissFinishRef.current = null;
        return;
      }
      if (dismissingRef.current) return;
      setSheetMoving(false);
      setMotionPhase("rest");
      markSheetCovered(lockOwnerRef.current);
    };

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== sheet || event.propertyName !== "transform") return;
      settle();
    };
    sheet.addEventListener("transitionend", onEnd);
    const ms = motionPhase === "dismiss" ? DISMISS_MS : OPEN_MS;
    const safety = window.setTimeout(settle, ms + 90);
    return () => {
      settled = true;
      sheet.removeEventListener("transitionend", onEnd);
      window.clearTimeout(safety);
    };
  }, [intercept, isSheetViewport, motionPhase, reduceMotion]);

  useLayoutEffect(() => {
    if (!intercept || !isSheetViewport || !trainerId || exited || dismissingRef.current) {
      return;
    }
    const body = rootRef.current?.querySelector(".profile-sheet__body");
    if (body instanceof HTMLElement) {
      body.scrollTop = 0;
    }
  }, [exited, hydrated, intercept, isSheetViewport, trainerId]);

  useEffect(() => {
    if (!intercept || !isSheetViewport) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      /* Nested lightboxes own Escape while open */
      if (
        document.body.classList.contains("gallery-modal-open") ||
        document.body.classList.contains("profile-image-preview-open") ||
        document.body.classList.contains("inquiry-sheet-open")
      ) {
        return;
      }
      event.preventDefault();
      dismiss();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss, intercept, isSheetViewport]);

  /*
   * Browser back: soft-nav keeps this tree mounted briefly. Run the same
   * slide-down; skip a second router.back() (history already moved).
   */
  useEffect(() => {
    if (!intercept || !isSheetViewport) return;

    function onPopState() {
      if (programmaticNavRef.current) return;
      if (dismissingRef.current || exited) return;
      dismissingRef.current = true;
      runDismissAnimation({ navigate: false });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [exited, intercept, isSheetViewport, runDismissAnimation]);

  /* Canonical profile URL — visible document, no sign-in and no map tap. */
  if (!intercept) {
    return <>{children}</>;
  }

  if (!isSheetViewport) {
    if (!overlayActive) {
      return null;
    }

    return (
      <ProfileSheetDismissProvider dismiss={navigateAway}>
        <ProfileSheetToolbarHostProvider>
          <DesktopProfileIntercept label={label} onDismiss={navigateAway}>
            {children}
          </DesktopProfileIntercept>
        </ProfileSheetToolbarHostProvider>
      </ProfileSheetDismissProvider>
    );
  }

  if (exited || !overlayActive) {
    return null;
  }

  if (!hydrated || typeof document === "undefined") {
    return (
      <div className="profile-sheet-ssr" aria-busy="true">
        {children}
      </div>
    );
  }

  return createPortal(
    <ProfileSheetDismissProvider dismiss={dismiss}>
      <ProfileSheetToolbarHostProvider>
        <div ref={rootRef} className="profile-sheet-root" role="presentation">
          <button
            type="button"
            className="smoac-control profile-sheet__backdrop profile-sheet__backdrop--fade-in"
            aria-label="Close profile"
            onPointerDown={backdropDismiss.onPointerDown}
            onPointerUp={backdropDismiss.onPointerUp}
            onClick={backdropDismiss.onClick}
          />

          <ProfileSheetChrome
            label={label}
            motionPhase={motionPhase}
            sheetMoving={sheetMoving}
          >
            {children}
          </ProfileSheetChrome>
        </div>
      </ProfileSheetToolbarHostProvider>
    </ProfileSheetDismissProvider>,
    document.body
  );
}

function DesktopProfileIntercept({
  label,
  onDismiss,
  children,
}: {
  label: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const toolbarHost = useProfileSheetToolbarHost();
  const backdropDismiss = useOwnPointerDismiss(onDismiss);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (
        document.body.classList.contains("gallery-modal-open") ||
        document.body.classList.contains("profile-image-preview-open") ||
        document.body.classList.contains("inquiry-sheet-open")
      ) {
        return;
      }
      event.preventDefault();
      onDismiss();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div className="profile-intercept-page" role="presentation">
      <button
        type="button"
        className="smoac-control profile-intercept-page__backdrop"
        aria-label="Close profile"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div
        className="profile-intercept-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div
          ref={toolbarHost?.hostRef}
          className="profile-sheet__toolbar-host"
        />
        <div className="profile-intercept-dialog__body">{children}</div>
      </div>
    </div>
  );
}

/** Inner chrome so toolbar host callback ref can read context. */
function sheetClassName(phase: SheetMotion, moving: boolean): string {
  if (!moving || phase === "rest") return "profile-sheet profile-sheet--settled";
  if (phase === "dismiss") {
    return "profile-sheet profile-sheet--animating profile-sheet--dismiss";
  }
  if (phase === "to") {
    return "profile-sheet profile-sheet--animating profile-sheet--to";
  }
  return "profile-sheet profile-sheet--animating profile-sheet--from";
}

function ProfileSheetChrome({
  label,
  motionPhase,
  sheetMoving,
  children,
}: {
  label: string;
  motionPhase: SheetMotion;
  sheetMoving: boolean;
  children: ReactNode;
}) {
  const toolbarHost = useProfileSheetToolbarHost();

  return (
    <div
      className={sheetClassName(motionPhase, sheetMoving)}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="profile-sheet__chrome" aria-hidden>
        <div className="profile-sheet__handle-hit profile-sheet__handle-hit--static">
          <span className="profile-sheet__handle" />
        </div>
      </div>

      <div
        ref={toolbarHost?.hostRef}
        className="profile-sheet__toolbar-host"
      />

      <div className="profile-sheet__body">{children}</div>
    </div>
  );
}
