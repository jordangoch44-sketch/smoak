"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import {
  closeOptimisticProfileSheet,
  getOptimisticProfileSheetServerSnapshot,
  getOptimisticProfileSheetSnapshot,
  markOptimisticProfileSheetEnterReady,
  subscribeOptimisticProfileSheet,
} from "@/lib/primed-trainer-profile";
import type { Trainer } from "@/types/trainer";

/** GPU-friendly tween — keep short; avoid springs (overshoot reads as zoom). */
const OPEN_TRANSITION = {
  type: "tween" as const,
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
const DISMISS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const DISMISS_DURATION = 0.26;
const DISMISS_OVERFLOW_PX = 96;

function viewportHeight(): number {
  if (typeof window === "undefined") return 800;
  return Math.max(
    window.visualViewport?.height ?? 0,
    window.innerHeight ?? 0,
    document.documentElement?.clientHeight ?? 0,
    800
  );
}

/**
 * Instant profile sheet from the tapped card — light preview (photo + name)
 * slides up on the compositor; full profile claims after enter settles.
 */
export function OptimisticProfileSheetHost() {
  const optimistic = useSyncExternalStore(
    subscribeOptimisticProfileSheet,
    getOptimisticProfileSheetSnapshot,
    getOptimisticProfileSheetServerSnapshot
  );
  const hydrated = useHydrated();
  const isSheetViewport = useTabletViewport(true);

  if (!hydrated || !isSheetViewport || !optimistic) return null;

  return (
    <OptimisticProfileSheet
      key={optimistic.trainer.id}
      trainer={optimistic.trainer}
    />
  );
}

function OptimisticProfileSheet({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const y = useMotionValue(
    typeof window !== "undefined" ? viewportHeight() : 800
  );
  const vhRef = useRef(viewportHeight());
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissingRef = useRef(false);
  const [exited, setExited] = useState(false);
  const [entering, setEntering] = useState(true);

  const dismiss = useCallback(() => {
    if (dismissingRef.current || exited) return;
    dismissingRef.current = true;
    setEntering(false);

    const root = rootRef.current;
    root?.classList.add("profile-sheet-root--pass-through");
    root?.setAttribute("inert", "");
    document.body.classList.remove("profile-sheet-open");
    document.documentElement.classList.remove("profile-sheet-open");
    document.body.classList.add("profile-sheet-dismissing");

    const sheet = root?.querySelector(".profile-sheet");
    const sheetH =
      sheet instanceof HTMLElement
        ? Math.max(sheet.offsetHeight, sheet.getBoundingClientRect().height)
        : 0;
    const target =
      Math.max(sheetH, vhRef.current, y.get() + 48) + DISMISS_OVERFLOW_PX;

    const finish = () => {
      document.body.classList.remove("profile-sheet-dismissing");
      closeOptimisticProfileSheet();
      setExited(true);
      if (pathname.startsWith(`/trainers/${trainer.id}`)) {
        if (window.history.length > 1) router.back();
      }
    };

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
  }, [exited, pathname, reduceMotion, router, trainer.id, y]);

  useLayoutEffect(() => {
    if (exited) return;
    vhRef.current = viewportHeight();
    document.body.classList.add("profile-sheet-open");
    document.documentElement.classList.add("profile-sheet-open");
    y.set(vhRef.current);

    if (reduceMotion) {
      y.set(0);
      setEntering(false);
      markOptimisticProfileSheetEnterReady(trainer.id);
      return () => {
        document.body.classList.remove("profile-sheet-open");
        document.documentElement.classList.remove("profile-sheet-open");
        document.body.classList.remove("profile-sheet-dismissing");
      };
    }

    setEntering(true);
    const controls = animate(y, 0, OPEN_TRANSITION);
    void controls.then(() => {
      setEntering(false);
      markOptimisticProfileSheetEnterReady(trainer.id);
    });

    return () => {
      controls.stop();
      document.body.classList.remove("profile-sheet-open");
      document.documentElement.classList.remove("profile-sheet-open");
      document.body.classList.remove("profile-sheet-dismissing");
    };
  }, [exited, reduceMotion, trainer.id, y]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss]);

  if (exited || typeof document === "undefined") return null;

  return createPortal(
    <div ref={rootRef} className="profile-sheet-root" role="presentation">
      <button
        type="button"
        className="smoac-control profile-sheet__backdrop profile-sheet__backdrop--fade-in"
        aria-label="Close profile"
        onClick={dismiss}
      />
      <motion.div
        className={
          entering
            ? "profile-sheet profile-sheet--animating"
            : "profile-sheet"
        }
        role="dialog"
        aria-modal="true"
        aria-label={`${trainer.name} profile`}
        style={{ y }}
      >
        <div className="profile-sheet__chrome" aria-hidden>
          <div className="profile-sheet__handle-hit profile-sheet__handle-hit--static">
            <span className="profile-sheet__handle" />
          </div>
        </div>

        <div className="profile-sheet__body">
          <div className="profile-sheet__optimistic-preview">
            <TrainerThumbnail
              src={trainer.image}
              name={trainer.name}
              size="card"
              priority
              className="profile-sheet__optimistic-thumb"
              imageClassName="profile-sheet__optimistic-thumb-img"
            />
            <div className="profile-sheet__optimistic-copy">
              <p className="profile-sheet__optimistic-name">{trainer.name}</p>
              <TrainerProfessionLabel
                trainer={trainer}
                className="profile-sheet__optimistic-profession"
              />
              <p className="profile-sheet__optimistic-hint" aria-live="polite">
                Loading details…
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
