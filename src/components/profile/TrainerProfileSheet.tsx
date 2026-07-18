"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { SITE_ROUTES } from "@/lib/navigation";
import { ProfileSheetDismissProvider } from "./ProfileSheetDismissContext";
import { ProfileSheetToolbarHostProvider } from "./ProfileSheetToolbarHostContext";

const OPEN_SPRING = {
  type: "spring" as const,
  damping: 40,
  stiffness: 360,
  mass: 0.92,
};
const DISMISS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
/** Unified exit — entire sheet + floating chrome slide down together. */
const DISMISS_DURATION = 0.26;

interface TrainerProfileSheetProps {
  children: ReactNode;
  label?: string;
}

function viewportHeight(): number {
  if (typeof window === "undefined") return 800;
  return window.visualViewport?.height ?? window.innerHeight ?? 800;
}

function lockSheetChrome() {
  document.body.classList.add("profile-sheet-open");
  document.documentElement.classList.add("profile-sheet-open");
  document.body.classList.remove("profile-sheet-dismissing");
}

function unlockSheetChrome() {
  document.body.classList.remove("profile-sheet-open");
  document.documentElement.classList.remove("profile-sheet-open");
}

function markSheetDismissing() {
  document.body.classList.add("profile-sheet-dismissing");
}

function clearSheetDismissing() {
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
}: TrainerProfileSheetProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const isSheetViewport = useTabletViewport();
  const reduceMotion = useReducedMotion();
  const y = useMotionValue(0);
  const vhRef = useRef(viewportHeight());
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarHostRef = useRef<HTMLDivElement>(null);
  const dismissingRef = useRef(false);
  const openAnimRef = useRef<{ stop: () => void } | null>(null);
  const programmaticNavRef = useRef(false);

  const backdropOpacity = useTransform(y, (latest) => {
    const fadeRange = vhRef.current * 0.45;
    const progress = Math.min(1, Math.max(0, latest / fadeRange));
    return 0.85 * (1 - progress);
  });

  const navigateAway = useCallback(() => {
    programmaticNavRef.current = true;
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(SITE_ROUTES.explore);
  }, [router]);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    const t0 = performance.now();
    console.info("[close-timing] profile dismiss start", t0);

    openAnimRef.current?.stop();
    openAnimRef.current = null;

    markSheetDismissing();
    const root = rootRef.current;
    root?.classList.add("profile-sheet-root--pass-through");
    root?.setAttribute("inert", "");

    const finish = () => {
      console.info(
        "[close-timing] profile exit animation done",
        performance.now(),
        "Δms",
        Math.round(performance.now() - t0)
      );
      unlockSheetChrome();
      /* Route sync after visual close — do not block the slide. */
      navigateAway();
    };

    if (reduceMotion) {
      y.set(vhRef.current);
      finish();
      return;
    }

    const target = Math.max(vhRef.current, y.get() + 48);
    void animate(y, target, {
      duration: DISMISS_DURATION,
      ease: DISMISS_EASE,
    }).then(finish);
  }, [navigateAway, reduceMotion, y]);

  useEffect(() => {
    if (!isSheetViewport) return;

    const syncVh = () => {
      vhRef.current = viewportHeight();
    };
    syncVh();
    window.addEventListener("resize", syncVh);
    window.visualViewport?.addEventListener("resize", syncVh);

    if (dismissingRef.current) {
      return () => {
        window.removeEventListener("resize", syncVh);
        window.visualViewport?.removeEventListener("resize", syncVh);
        unlockSheetChrome();
        clearSheetDismissing();
      };
    }

    lockSheetChrome();
    dismissingRef.current = false;
    programmaticNavRef.current = false;
    y.set(vhRef.current);

    if (reduceMotion) {
      y.set(0);
    } else {
      const controls = animate(y, 0, OPEN_SPRING);
      openAnimRef.current = controls;
      void controls.then(() => {
        openAnimRef.current = null;
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
  }, [isSheetViewport, reduceMotion, y]);

  useEffect(() => {
    if (!isSheetViewport) return;

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
  }, [dismiss, isSheetViewport]);

  /*
   * Browser back: soft-nav keeps this tree mounted briefly. Run the same
   * slide-down; skip a second router.back() (history already moved).
   */
  useEffect(() => {
    if (!isSheetViewport) return;

    function onPopState() {
      if (programmaticNavRef.current) return;
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      console.info("[close-timing] profile popstate dismiss", performance.now());

      openAnimRef.current?.stop();
      openAnimRef.current = null;
      markSheetDismissing();
      const root = rootRef.current;
      root?.classList.add("profile-sheet-root--pass-through");
      root?.setAttribute("inert", "");

      const done = () => {
        unlockSheetChrome();
      };

      if (reduceMotion) {
        y.set(vhRef.current);
        done();
        return;
      }

      const target = Math.max(vhRef.current, y.get() + 48);
      void animate(y, target, {
        duration: DISMISS_DURATION,
        ease: DISMISS_EASE,
      }).then(done);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isSheetViewport, reduceMotion, y]);

  if (!isSheetViewport) {
    return <>{children}</>;
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
      <ProfileSheetToolbarHostProvider hostRef={toolbarHostRef}>
        <div ref={rootRef} className="profile-sheet-root" role="presentation">
          <motion.button
            type="button"
            className="smoac-control profile-sheet__backdrop"
            aria-label="Close profile"
            style={{ opacity: backdropOpacity }}
            onClick={dismiss}
          />

          <motion.div
            className="profile-sheet"
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

            {/* Floating X / actions — same transform layer as the sheet */}
            <div
              ref={toolbarHostRef}
              className="profile-sheet__toolbar-host"
            />

            <div className="profile-sheet__body">{children}</div>
          </motion.div>
        </div>
      </ProfileSheetToolbarHostProvider>
    </ProfileSheetDismissProvider>,
    document.body
  );
}
