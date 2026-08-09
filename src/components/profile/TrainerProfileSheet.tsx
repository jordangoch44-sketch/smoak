"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { SITE_ROUTES } from "@/lib/navigation";
import {
  claimOptimisticProfileSheet,
  getOptimisticProfileSheetServerSnapshot,
  getOptimisticProfileSheetSnapshot,
  peekOptimisticProfileSheet,
  subscribeOptimisticProfileSheet,
} from "@/lib/primed-trainer-profile";
import { ProfileSheetDismissProvider } from "./ProfileSheetDismissContext";
import {
  ProfileSheetToolbarHostProvider,
  useProfileSheetToolbarHost,
} from "./ProfileSheetToolbarHostContext";
import type { MotionValue } from "framer-motion";

/** GPU tween — no spring overshoot (reads as zoom on phones). */
const OPEN_TRANSITION = {
  type: "tween" as const,
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
const DISMISS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
/** Unified exit — entire sheet + floating chrome slide down together. */
const DISMISS_DURATION = 0.26;
/** Extra travel so iOS visualViewport < 100dvh never leaves a stuck strip. */
const DISMISS_OVERFLOW_PX = 96;

interface TrainerProfileSheetProps {
  children: ReactNode;
  label?: string;
  /** Specialist id — used to claim the optimistic card sheet without a second enter. */
  trainerId?: string;
}

function viewportHeight(): number {
  if (typeof window === "undefined") return 800;
  return Math.max(
    window.visualViewport?.height ?? 0,
    window.innerHeight ?? 0,
    document.documentElement?.clientHeight ?? 0,
    800
  );
}

/** How far to slide so the sheet fully clears the screen (Safari chrome safe). */
function dismissTravelPx(root: HTMLElement | null, yNow: number): number {
  const sheet = root?.querySelector(".profile-sheet");
  const sheetH =
    sheet instanceof HTMLElement
      ? Math.max(sheet.offsetHeight, sheet.getBoundingClientRect().height)
      : 0;
  const vh = viewportHeight();
  return Math.max(sheetH, vh, yNow + 48) + DISMISS_OVERFLOW_PX;
}

/** Blocks remount re-lock while soft-nav still holds the sheet tree. */
let chromeUnlockGuardUntil = 0;
/** True while a dismiss animation owns chrome — remounts must not re-lock. */
let sheetChromeDismissing = false;

function lockSheetChrome() {
  if (sheetChromeDismissing || Date.now() < chromeUnlockGuardUntil) return;
  document.body.classList.add("profile-sheet-open");
  document.documentElement.classList.add("profile-sheet-open");
  document.body.classList.remove("profile-sheet-dismissing");
}

function unlockSheetChrome() {
  document.body.classList.remove("profile-sheet-open");
  document.documentElement.classList.remove("profile-sheet-open");
  chromeUnlockGuardUntil = Date.now() + 400;
}

function markSheetDismissing() {
  sheetChromeDismissing = true;
  document.body.classList.add("profile-sheet-dismissing");
}

function clearSheetDismissing() {
  sheetChromeDismissing = false;
  document.body.classList.remove("profile-sheet-dismissing");
}

/**
 * Mobile/tablet: bottom sheet over the still-mounted previous page
 * (`@modal` intercept). Close via X / backdrop / Escape / browser back.
 * No swipe-drag dismissal — one unified slide-down exit.
 * Desktop: pass-through.
 */
export function TrainerProfileSheet({
  children,
  label = "Specialist profile",
  trainerId,
}: TrainerProfileSheetProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const isSheetViewport = useTabletViewport(true);
  const reduceMotion = useReducedMotion();
  const optimistic = useSyncExternalStore(
    subscribeOptimisticProfileSheet,
    getOptimisticProfileSheetSnapshot,
    getOptimisticProfileSheetServerSnapshot
  );
  const fromOptimisticRef = useRef(
    Boolean(
      trainerId &&
        typeof window !== "undefined" &&
        peekOptimisticProfileSheet()?.trainer.id === trainerId
    )
  );
  const [handoffReady, setHandoffReady] = useState(!fromOptimisticRef.current);
  const [entering, setEntering] = useState(!fromOptimisticRef.current);
  /* Start off-screen so the first paint never flashes the open sheet.
   * Optimistic handoff stays at 0 (no second enter). */
  const y = useMotionValue(
    fromOptimisticRef.current
      ? 0
      : typeof window !== "undefined"
        ? viewportHeight()
        : 800
  );
  const vhRef = useRef(viewportHeight());
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissingRef = useRef(false);
  const finishOnceRef = useRef(false);
  const openAnimRef = useRef<{ stop: () => void } | null>(null);
  const programmaticNavRef = useRef(false);
  /** Drop portal DOM after slide so soft-nav cannot leave a stuck strip. */
  const [exited, setExited] = useState(false);

  const navigateAway = useCallback(() => {
    programmaticNavRef.current = true;
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(SITE_ROUTES.explore);
  }, [router]);

  const runDismissAnimation = useCallback(
    (options: { navigate: boolean }) => {
      openAnimRef.current?.stop();
      openAnimRef.current = null;
      setEntering(false);

      /*
       * Restore site chrome immediately. Soft-nav can keep this tree mounted
       * for seconds after the slide; waiting for animation/unmount left the
       * bottom nav and header missing for 10s+.
       */
      unlockSheetChrome();
      markSheetDismissing();
      const root = rootRef.current;
      root?.classList.add("profile-sheet-root--pass-through");
      root?.setAttribute("inert", "");

      finishOnceRef.current = false;
      const finish = () => {
        if (finishOnceRef.current) return;
        finishOnceRef.current = true;
        clearSheetDismissing();
        root?.classList.add("profile-sheet-root--exited");
        /* Unmount portal before/while soft-nav clears @modal — prevents
         * a 1‑frame remnant strip under the bottom nav on iOS. */
        setExited(true);
        if (options.navigate) navigateAway();
      };

      const target = dismissTravelPx(root, y.get());

      if (reduceMotion) {
        y.set(target);
        finish();
        return;
      }

      const safety = window.setTimeout(finish, DISMISS_DURATION * 1000 + 160);
      void animate(y, target, {
        type: "tween",
        duration: DISMISS_DURATION,
        ease: DISMISS_EASE,
      }).then(() => {
        window.clearTimeout(safety);
        finish();
      });
    },
    [navigateAway, reduceMotion, y]
  );

  const dismiss = useCallback(() => {
    if (dismissingRef.current || exited) return;
    dismissingRef.current = true;
    runDismissAnimation({ navigate: true });
  }, [exited, runDismissAnimation]);

  /* Wait for optimistic slide to finish, then claim (no mid-animation swap). */
  useLayoutEffect(() => {
    if (!trainerId || handoffReady) return;
    if (!optimistic || optimistic.trainer.id !== trainerId) {
      fromOptimisticRef.current = false;
      setHandoffReady(true);
      return;
    }
    if (!optimistic.enterReady) return;
    if (claimOptimisticProfileSheet(trainerId)) {
      y.set(0);
      setEntering(false);
      setHandoffReady(true);
    }
  }, [handoffReady, optimistic, trainerId, y]);

  useLayoutEffect(() => {
    if (!isSheetViewport || !handoffReady) return;

    const syncVh = () => {
      vhRef.current = viewportHeight();
    };
    syncVh();
    window.addEventListener("resize", syncVh);
    window.visualViewport?.addEventListener("resize", syncVh);

    if (dismissingRef.current || exited) {
      return () => {
        window.removeEventListener("resize", syncVh);
        window.visualViewport?.removeEventListener("resize", syncVh);
        unlockSheetChrome();
        clearSheetDismissing();
      };
    }

    dismissingRef.current = false;
    finishOnceRef.current = false;
    sheetChromeDismissing = false;
    chromeUnlockGuardUntil = 0;
    programmaticNavRef.current = false;
    /* Fresh open — never keep a prior exit's pass-through / inert. */
    const root = rootRef.current;
    root?.classList.remove("profile-sheet-root--pass-through");
    root?.removeAttribute("inert");
    lockSheetChrome();

    if (fromOptimisticRef.current || reduceMotion) {
      y.set(0);
      setEntering(false);
    } else {
      y.set(vhRef.current);
      setEntering(true);
      const controls = animate(y, 0, OPEN_TRANSITION);
      openAnimRef.current = controls;
      void controls.then(() => {
        openAnimRef.current = null;
        setEntering(false);
      });
    }

    return () => {
      openAnimRef.current?.stop();
      openAnimRef.current = null;
      window.removeEventListener("resize", syncVh);
      window.visualViewport?.removeEventListener("resize", syncVh);
      unlockSheetChrome();
      clearSheetDismissing();
    };
  }, [exited, handoffReady, isSheetViewport, reduceMotion, y]);

  useEffect(() => {
    if (!isSheetViewport || !handoffReady) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      /* Nested lightboxes own Escape while open */
      if (
        document.body.classList.contains("gallery-modal-open") ||
        document.body.classList.contains("profile-image-preview-open")
      ) {
        return;
      }
      event.preventDefault();
      dismiss();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss, handoffReady, isSheetViewport]);

  /*
   * Browser back: soft-nav keeps this tree mounted briefly. Run the same
   * slide-down; skip a second router.back() (history already moved).
   */
  useEffect(() => {
    if (!isSheetViewport || !handoffReady) return;

    function onPopState() {
      if (programmaticNavRef.current) return;
      if (dismissingRef.current || exited) return;
      dismissingRef.current = true;
      runDismissAnimation({ navigate: false });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [exited, handoffReady, isSheetViewport, runDismissAnimation]);

  if (!isSheetViewport) {
    return <>{children}</>;
  }

  if (exited) {
    return null;
  }

  /* Optimistic sheet owns the enter — stay invisible until handoff. */
  if (!handoffReady) {
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
            onClick={dismiss}
          />

          <ProfileSheetChrome label={label} y={y} entering={entering}>
            {children}
          </ProfileSheetChrome>
        </div>
      </ProfileSheetToolbarHostProvider>
    </ProfileSheetDismissProvider>,
    document.body
  );
}

/** Inner chrome so toolbar host callback ref can read context. */
function ProfileSheetChrome({
  label,
  y,
  entering,
  children,
}: {
  label: string;
  y: MotionValue<number>;
  entering: boolean;
  children: ReactNode;
}) {
  const toolbarHost = useProfileSheetToolbarHost();

  return (
    <motion.div
      className={
        entering ? "profile-sheet profile-sheet--animating" : "profile-sheet"
      }
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{ y }}
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
    </motion.div>
  );
}
