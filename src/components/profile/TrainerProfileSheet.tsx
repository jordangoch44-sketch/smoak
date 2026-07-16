"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { SITE_ROUTES } from "@/lib/navigation";
import { ProfileSheetDismissProvider } from "./ProfileSheetDismissContext";

/** Commit dismiss if released past this share of the viewport */
const DISMISS_DISTANCE_RATIO = 0.22;
/** Or if flung downward faster than this (px/s) */
const DISMISS_VELOCITY = 750;

const OPEN_SPRING = {
  type: "spring" as const,
  damping: 40,
  stiffness: 360,
  mass: 0.92,
};
const SNAP_SPRING = {
  type: "spring" as const,
  damping: 38,
  stiffness: 420,
  mass: 0.85,
};
const DISMISS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const DISMISS_DURATION = 0.28;

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
 * Mobile/tablet: iOS-style bottom sheet over the still-mounted previous page
 * (via `@modal` intercepting route). Swipe down / backdrop / X dismisses.
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
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const vhRef = useRef(viewportHeight());
  const [dragBottom, setDragBottom] = useState(() => viewportHeight());
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissingRef = useRef(false);
  const dragEnabledRef = useRef(false);
  const openAnimRef = useRef<{ stop: () => void } | null>(null);

  const backdropOpacity = useTransform(y, (latest) => {
    const fadeRange = vhRef.current * 0.4;
    const progress = Math.min(1, Math.max(0, latest / fadeRange));
    return 0.5 * (1 - progress);
  });

  const navigateAway = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(SITE_ROUTES.explore);
  }, [router]);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    dragEnabledRef.current = false;
    openAnimRef.current?.stop();
    openAnimRef.current = null;

    /*
     * Restore interactivity before the route catches up:
     * 1) unlock scroll / chrome
     * 2) make the still-mounted overlay fully tap-through
     * 3) navigate immediately (do not wait on the slide-out)
     */
    unlockSheetChrome();
    markSheetDismissing();
    const root = rootRef.current;
    root?.classList.add("profile-sheet-root--pass-through");
    root?.setAttribute("inert", "");

    if (!reduceMotion) {
      const target = Math.max(vhRef.current, y.get() + 48);
      void animate(y, target, {
        duration: DISMISS_DURATION,
        ease: DISMISS_EASE,
      });
    }

    /* Keep `profile-sheet-dismissing` until unmount so portaled toolbar stays inert */
    navigateAway();
  }, [navigateAway, reduceMotion, y]);

  useEffect(() => {
    if (!isSheetViewport) return;

    const syncVh = () => {
      const next = viewportHeight();
      vhRef.current = next;
      setDragBottom(next);
    };
    syncVh();
    window.addEventListener("resize", syncVh);
    window.visualViewport?.addEventListener("resize", syncVh);

    /* Mid-dismiss remounts must not re-lock the page */
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
    dragEnabledRef.current = false;

    y.set(vhRef.current);

    if (reduceMotion) {
      y.set(0);
      dragEnabledRef.current = true;
    } else {
      const controls = animate(y, 0, OPEN_SPRING);
      openAnimRef.current = controls;
      void controls.then(() => {
        if (!dismissingRef.current) {
          dragEnabledRef.current = true;
        }
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
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss, isSheetViewport]);

  /* Never allow the sheet to drag above the resting position */
  useMotionValueEvent(y, "change", (latest) => {
    if (latest < 0) y.set(0);
  });

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (dismissingRef.current) return;

      const distance = Math.max(info.offset.y, y.get());
      const threshold = vhRef.current * DISMISS_DISTANCE_RATIO;
      const flingDown = info.velocity.y > DISMISS_VELOCITY;

      if (distance > threshold || flingDown) {
        dismiss();
        return;
      }

      void animate(
        y,
        0,
        reduceMotion ? { duration: 0.16, ease: "easeOut" } : SNAP_SPRING
      );
    },
    [dismiss, reduceMotion, y]
  );

  const startHandleDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (dismissingRef.current || !dragEnabledRef.current) return;
      openAnimRef.current?.stop();
      openAnimRef.current = null;
      dragControls.start(event);
    },
    [dragControls]
  );

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
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.04}
          dragConstraints={{ top: 0, bottom: dragBottom }}
          onDragEnd={handleDragEnd}
        >
          <div className="profile-sheet__chrome">
            <button
              type="button"
              className="profile-sheet__handle-hit"
              aria-label="Drag to close profile"
              onPointerDown={startHandleDrag}
            >
              <span className="profile-sheet__handle" aria-hidden />
            </button>
          </div>

          <div className="profile-sheet__body">{children}</div>
        </motion.div>
      </div>
    </ProfileSheetDismissProvider>,
    document.body
  );
}
