"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
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
  useMobileBottomNavTransition,
} from "@/contexts/MobileBottomNavTransitionContext";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { useTabletViewport } from "@/hooks/useTabletViewport";
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
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: -12, scale: 0.998, filter: "blur(5px)" },
  };
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
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: -4, scale: 0.997, filter: "blur(6px)" },
  };
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const panel = useBottomNavPanelTransition();
  const { completePanelTransition } = useMobileBottomNavTransition();
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
