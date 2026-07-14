"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  motion,
  useAnimation,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { SITE_ROUTES } from "@/lib/navigation";
import { ProfileSheetDismissProvider } from "./ProfileSheetDismissContext";

const DISMISS_OFFSET_PX = 120;
const DISMISS_VELOCITY = 700;
const EXPLORE_FALLBACK = SITE_ROUTES.explore;

interface TrainerProfileSheetProps {
  children: ReactNode;
  label?: string;
}

/**
 * Mobile/tablet: present the specialist profile as an iOS-style bottom sheet.
 * Swipe down (or backdrop) dismisses with router.back(). Desktop: pass-through.
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
  const sheetControls = useAnimation();
  const [ready, setReady] = useState(false);
  const dismissingRef = useRef(false);

  const navigateAway = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(EXPLORE_FALLBACK);
  }, [router]);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;

    const finish = () => navigateAway();

    if (reduceMotion) {
      finish();
      return;
    }

    void sheetControls
      .start({
        y: "100%",
        transition: { type: "spring", damping: 36, stiffness: 420, mass: 0.85 },
      })
      .then(finish);
  }, [navigateAway, reduceMotion, sheetControls]);

  useEffect(() => {
    if (!isSheetViewport) return;

    document.body.classList.add("profile-sheet-open");
    document.documentElement.classList.add("profile-sheet-open");
    dismissingRef.current = false;
    setReady(false);

    void sheetControls
      .start({
        y: 0,
        transition: reduceMotion
          ? { duration: 0.16, ease: "easeOut" }
          : { type: "spring", damping: 34, stiffness: 400, mass: 0.85 },
      })
      .then(() => setReady(true));

    return () => {
      document.body.classList.remove("profile-sheet-open");
      document.documentElement.classList.remove("profile-sheet-open");
    };
  }, [isSheetViewport, reduceMotion, sheetControls]);

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

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (
        info.offset.y > DISMISS_OFFSET_PX ||
        info.velocity.y > DISMISS_VELOCITY
      ) {
        dismiss();
        return;
      }
      void sheetControls.start({
        y: 0,
        transition: reduceMotion
          ? { duration: 0.14, ease: "easeOut" }
          : { type: "spring", damping: 32, stiffness: 460, mass: 0.8 },
      });
    },
    [dismiss, reduceMotion, sheetControls]
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
      <div className="profile-sheet-root" role="presentation">
        <button
          type="button"
          className="smoac-control profile-sheet__backdrop"
          aria-label="Close profile"
          onClick={dismiss}
        />

        <motion.div
          className="profile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          initial={{ y: "100%" }}
          animate={sheetControls}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.52 }}
          onDragEnd={handleDragEnd}
        >
          <div className="profile-sheet__chrome">
            <button
              type="button"
              className="profile-sheet__handle-hit"
              aria-label="Drag to close profile"
              onPointerDown={(event) => {
                if (!ready) return;
                dragControls.start(event);
              }}
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
