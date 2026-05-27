"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import {
  desktopPageTransition,
  isSavedPath,
  isTrainerProfilePath,
  mobilePageTransition,
} from "@/lib/motion";
import {
  getMobileMaxWidthSnapshot,
  subscribeMobileMaxWidth,
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

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const mobile = useSyncExternalStore(
    subscribeMobileMaxWidth,
    getMobileMaxWidthSnapshot,
    /* Mobile-first snapshot — avoids SSR/desktop layer with pointer-events:none blocking iOS taps */
    () => true
  );
  const profileReveal = isTrainerProfilePath(pathname);
  const savedReveal = isSavedPath(pathname);

  const variants = reducedMotion
    ? reducedVariants
    : mobile
      ? savedReveal
        ? buildSavedMobileVariants()
        : buildMobileVariants(profileReveal)
      : savedReveal
        ? buildSavedDesktopVariants()
        : buildDesktopVariants(profileReveal);

  const transition: Transition = reducedMotion
    ? reducedTransition
    : mobile
      ? mobilePageTransition
      : desktopPageTransition;

  /* Mobile: no AnimatePresence — exit layers steal iOS Safari taps */
  if (mobile) {
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
