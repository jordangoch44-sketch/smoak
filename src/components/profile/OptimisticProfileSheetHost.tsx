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
  useTransform,
} from "framer-motion";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileSheetDismissProvider } from "@/components/profile/ProfileSheetDismissContext";
import {
  ProfileSheetToolbarHostProvider,
  useProfileSheetToolbarHost,
} from "@/components/profile/ProfileSheetToolbarHostContext";
import { useHydrated } from "@/hooks/useHydrated";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import {
  closeOptimisticProfileSheet,
  getOptimisticProfileSheetServerSnapshot,
  getOptimisticProfileSheetSnapshot,
  subscribeOptimisticProfileSheet,
} from "@/lib/primed-trainer-profile";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import { cn } from "@/lib/utils";
import type { MotionValue } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";
import type { Trainer } from "@/types/trainer";

const OPEN_TRANSITION = {
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};
const DISMISS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const DISMISS_DURATION = 0.28;
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
 * Instant profile sheet from the tapped card — real photo/name while the
 * soft-nav intercept mounts, then claimed (no second enter animation).
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

function OptimisticProfileSheet({
  trainer,
}: {
  trainer: Trainer;
}) {
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

  const backdropOpacity = useTransform(y, (latest) => {
    const fadeRange = vhRef.current * 0.45;
    const progress = Math.min(1, Math.max(0, latest / fadeRange));
    return 0.85 * (1 - progress);
  });

  const dismiss = useCallback(() => {
    if (dismissingRef.current || exited) return;
    dismissingRef.current = true;

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
    } else {
      void animate(y, 0, OPEN_TRANSITION);
    }
    return () => {
      document.body.classList.remove("profile-sheet-open");
      document.documentElement.classList.remove("profile-sheet-open");
      document.body.classList.remove("profile-sheet-dismissing");
    };
  }, [exited, reduceMotion, y]);

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

  const profileStyle = normalizeProfileStyle(trainer.profileStyle);
  const pageStyle = {
    "--profile-accent-rgb": getProfileAccentRgb(profileStyle.accent),
  } as CSSProperties;

  return createPortal(
    <ProfileSheetDismissProvider dismiss={dismiss}>
      <ProfileSheetToolbarHostProvider>
        <div ref={rootRef} className="profile-sheet-root" role="presentation">
          <motion.button
            type="button"
            className="smoac-control profile-sheet__backdrop"
            aria-label="Close profile"
            style={{ opacity: backdropOpacity }}
            onClick={dismiss}
          />
          <OptimisticSheetChrome label={`${trainer.name} profile`} y={y}>
            <div
              className={cn("profile-page--styled")}
              style={pageStyle}
              data-profile-accent={profileStyle.accent}
            >
              <ProfileHero trainer={trainer} />
              <div className="profile-sheet__optimistic-rest" aria-live="polite">
                <p className="profile-sheet__optimistic-hint">Loading details…</p>
              </div>
            </div>
          </OptimisticSheetChrome>
        </div>
      </ProfileSheetToolbarHostProvider>
    </ProfileSheetDismissProvider>,
    document.body
  );
}

function OptimisticSheetChrome({
  label,
  y,
  children,
}: {
  label: string;
  y: MotionValue<number>;
  children: ReactNode;
}) {
  const toolbarHost = useProfileSheetToolbarHost();

  return (
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
      <div
        ref={toolbarHost?.hostRef}
        className="profile-sheet__toolbar-host"
      />
      <div className="profile-sheet__body">{children}</div>
    </motion.div>
  );
}
