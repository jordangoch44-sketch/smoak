"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import { BottomNavPanelTransition } from "@/components/layout/BottomNavPanelTransition";
import {
  useBottomNavPanelTransition,
  useCompleteBottomNavPanelTransition,
} from "@/contexts/MobileBottomNavTransitionContext";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import {
  isExploreNavPath,
  isHomeNavPath,
  isProfileNavPath,
  isSpecialistDashboardPath,
  isWorkoutsNavPath,
} from "@/lib/mobile-bottom-nav";
import {
  desktopPageTransition,
  isSavedPath,
  isTrainerProfilePath,
  mobilePageTransition,
} from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

const reducedTransition: Transition = { duration: 0.01 };

const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

function buildMobileVariants(profileReveal: boolean): Variants {
  const enterY = profileReveal ? 7 : 5;
  return {
    initial: { opacity: 0, y: enterY },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -3 },
  };
}

function buildSavedMobileVariants(): Variants {
  return {
    initial: { opacity: 0, y: -14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };
}

function buildSavedDesktopVariants(): Variants {
  return {
    initial: { opacity: 0, y: -18, scale: 0.996, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "none" },
    exit: { opacity: 0, y: -12, scale: 0.998, filter: "blur(5px)" },
  };
}

const TOOLBAR_FADE_MS = 760;

/** Last toolbar route. Survives the Suspense remount around page changes. */
let committedToolbarRouteKey: string | null = null;
/** Route that should fade, kept through React strict mode's extra mount. */
let toolbarFadeRouteKey: string | null = null;
/** When the current fade began, so a remount continues it instead of blinking back to blank. */
let toolbarFadeStartedAt = 0;

/** Enter-only fade. No exit layer, so the arriving page can take the next tap. */
function ToolbarPageFade({
  routeKey,
  children,
}: {
  routeKey: string;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const nodeRef = useRef<HTMLDivElement>(null);
  const playedRouteRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (committedToolbarRouteKey !== routeKey) {
      if (committedToolbarRouteKey !== null && !reducedMotion) {
        toolbarFadeRouteKey = routeKey;
        toolbarFadeStartedAt = performance.now();
      }
      committedToolbarRouteKey = routeKey;
    }
    if (!node || toolbarFadeRouteKey !== routeKey || playedRouteRef.current === routeKey) {
      return;
    }
    playedRouteRef.current = routeKey;
    const fadeKey = routeKey;
    const elapsed = toolbarFadeStartedAt > 0 ? performance.now() - toolbarFadeStartedAt : 0;
    node.getAnimations().forEach((animation) => animation.cancel());
    const fade = node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: TOOLBAR_FADE_MS,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "backwards",
    });
    if (elapsed > 0 && elapsed < TOOLBAR_FADE_MS) {
      fade.currentTime = elapsed;
    }
    window.setTimeout(() => {
      if (toolbarFadeRouteKey === fadeKey) {
        toolbarFadeRouteKey = null;
        toolbarFadeStartedAt = 0;
      }
    }, 480);
  }, [reducedMotion, routeKey]);

  return (
    <div ref={nodeRef} className="page-transition__content">
      {children}
    </div>
  );
}

function buildDesktopVariants(profileReveal: boolean): Variants {
  const enterY = profileReveal ? 12 : 8;
  const enterScale = profileReveal ? 0.986 : 0.989;
  return {
    initial: {
      opacity: 0,
      y: enterY,
      scale: enterScale,
      filter: "blur(12px)",
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: "none" },
    exit: { opacity: 0, y: -4, scale: 0.997, filter: "blur(6px)" },
  };
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const panel = useBottomNavPanelTransition();
  const completePanelTransition = useCompleteBottomNavPanelTransition();
  const isTabletViewport = useTabletViewport();
  const isMobileViewport = useMobileViewport();
  const profileReveal = isTrainerProfilePath(pathname);
  const savedReveal = isSavedPath(pathname);

  const routeKey = `${pathname}?${searchParams.toString()}`;
  const panelMotionKey = panel.active ? panel.motionKey : routeKey;

  const variants = useMemo(
    () =>
      reducedMotion
        ? reducedVariants
        : isMobileViewport
          ? savedReveal
            ? buildSavedMobileVariants()
            : buildMobileVariants(profileReveal)
          : savedReveal
            ? buildSavedDesktopVariants()
            : buildDesktopVariants(profileReveal),
    [isMobileViewport, profileReveal, reducedMotion, savedReveal]
  );

  const transition: Transition = reducedMotion
    ? reducedTransition
    : isMobileViewport
      ? mobilePageTransition
      : desktopPageTransition;

  if (isTabletViewport && panel.active) {
    return (
      <BottomNavPanelTransition
        panel={panel}
        motionKey={panelMotionKey}
        onEnterComplete={completePanelTransition}
      >
        {children}
      </BottomNavPanelTransition>
    );
  }

  const toolbarTab =
    isHomeNavPath(pathname) ||
    isExploreNavPath(pathname) ||
    isWorkoutsNavPath(pathname) ||
    isSavedPath(pathname) ||
    isProfileNavPath(pathname) ||
    isSpecialistDashboardPath(pathname);

  /* Phone/tablet toolbar taps: fade the new page in. No exiting layer. */
  if (isTabletViewport && toolbarTab) {
    return (
      <div className="page-transition">
        <ToolbarPageFade routeKey={routeKey}>{children}</ToolbarPageFade>
      </div>
    );
  }

  /* Other phone/tablet routes, and desktop toolbar tabs: no exit layer. */
  if (isTabletViewport || toolbarTab) {
    return (
      <div className="page-transition">
        <div className="page-transition__content">{children}</div>
      </div>
    );
  }

  return (
    <div className="page-transition">
      <AnimatePresence initial={false}>
        <motion.div
          key={pathname}
          className="page-transition__layer"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
        >
          <div className="page-transition__content">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
