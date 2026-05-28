"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import {
  useBottomNavPanelTransition,
  useCompleteBottomNavPanelTransition,
} from "@/contexts/MobileBottomNavTransitionContext";
import {
  bottomNavPanelTransition,
  desktopPageTransition,
  isSavedPath,
  isTrainerProfilePath,
  mobilePageTransition,
} from "@/lib/motion";
import type { BottomNavPanelDirection } from "@/lib/mobile-bottom-nav-transition";
import {
  getMobileMaxWidthSnapshot,
  getTabletMaxWidthSnapshot,
  subscribeMobileMaxWidth,
  subscribeTabletMaxWidth,
} from "@/lib/viewport";

interface PageTransitionProps {
  children: React.ReactNode;
}

const reducedTransition: Transition = { duration: 0.01 };

const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

function buildBottomNavPanelVariants(
  direction: BottomNavPanelDirection
): Variants {
  const enterY = direction === 1 ? 26 : -22;
  const exitY = direction === 1 ? -14 : 18;
  const enterScale = direction === 1 ? 0.988 : 0.992;
  const exitScale = 0.992;

  return {
    initial: {
      opacity: 0,
      y: enterY,
      scale: enterScale,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    exit: {
      opacity: 0.82,
      y: exitY,
      scale: exitScale,
    },
  };
}

/** Mobile — no scale/filter (Safari GPU + hit-testing) */
function buildMobileVariants(profileReveal: boolean): Variants {
  const enterY = profileReveal ? 7 : 5;

  return {
    initial: {
      opacity: 0,
      y: enterY,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -3,
    },
  };
}

/** Saved panel — descends from header, exits upward */
function buildSavedMobileVariants(): Variants {
  return {
    initial: {
      opacity: 0,
      y: -14,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -10,
    },
  };
}

function buildSavedDesktopVariants(): Variants {
  return {
    initial: {
      opacity: 0,
      y: -18,
      scale: 0.996,
      filter: "blur(8px)",
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.998,
      filter: "blur(5px)",
    },
  };
}

/** Desktop — subtle scale + deeper frost */
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
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: {
      opacity: 0,
      y: -4,
      scale: 0.997,
      filter: "blur(6px)",
    },
  };
}

function getIsTabletSnapshot(): boolean {
  return getTabletMaxWidthSnapshot();
}

function getIsTabletServerSnapshot(): boolean {
  return false;
}

function getIsMobileSnapshot(): boolean {
  return getMobileMaxWidthSnapshot();
}

function getIsMobileServerSnapshot(): boolean {
  return true;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const panel = useBottomNavPanelTransition();
  const completePanelTransition = useCompleteBottomNavPanelTransition();
  const isTabletViewport = useSyncExternalStore(
    subscribeTabletMaxWidth,
    getIsTabletSnapshot,
    getIsTabletServerSnapshot
  );
  const isMobileViewport = useSyncExternalStore(
    subscribeMobileMaxWidth,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot
  );
  const profileReveal = isTrainerProfilePath(pathname);
  const savedReveal = isSavedPath(pathname);

  const routeKey = `${pathname}?${searchParams.toString()}`;
  const panelMotionKey = panel.active ? panel.motionKey : routeKey;

  if (isTabletViewport && panel.active) {
    const panelVariants = reducedMotion
      ? reducedVariants
      : buildBottomNavPanelVariants(panel.direction);
    const panelTransition = reducedMotion
      ? reducedTransition
      : bottomNavPanelTransition;

    return (
      <div className="page-transition page-transition--bottom-nav-panel">
        <AnimatePresence
          initial={false}
          mode={panel.enterOnly ? "sync" : "popLayout"}
          custom={panel.direction}
        >
          <motion.div
            key={panelMotionKey}
            className="page-transition__layer page-transition__layer--panel"
            custom={panel.direction}
            variants={panelVariants}
            initial="initial"
            animate="animate"
            {...(panel.enterOnly ? {} : { exit: "exit" as const })}
            transition={panelTransition}
            onAnimationComplete={(definition) => {
              if (definition === "animate") {
                completePanelTransition();
              }
            }}
          >
            <div className="page-transition__content">{children}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const variants = reducedMotion
    ? reducedVariants
    : isMobileViewport
      ? savedReveal
        ? buildSavedMobileVariants()
        : buildMobileVariants(profileReveal)
      : savedReveal
        ? buildSavedDesktopVariants()
        : buildDesktopVariants(profileReveal);

  const transition: Transition = reducedMotion
    ? reducedTransition
    : isMobileViewport
      ? mobilePageTransition
      : desktopPageTransition;

  if (isTabletViewport) {
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
