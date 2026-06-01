"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BottomNavPanelTransitionState } from "@/contexts/MobileBottomNavTransitionContext";
import { useMobileMotionProfile } from "@/hooks/useMobileMotionProfile";
import {
  bottomNavPanelReducedTransition,
  bottomNavPanelReducedVariants,
  buildBottomNavPanelTransition,
  buildBottomNavPanelVariants,
} from "@/lib/motion";

interface BottomNavPanelTransitionProps {
  panel: BottomNavPanelTransitionState;
  motionKey: string;
  onEnterComplete: () => void;
  children: React.ReactNode;
}

function BottomNavPanelTransitionInner({
  panel,
  motionKey,
  onEnterComplete,
  children,
}: BottomNavPanelTransitionProps) {
  const { reducedMotion, fastMotion } = useMobileMotionProfile();
  const [animating, setAnimating] = useState(false);

  const variants = useMemo(
    () =>
      reducedMotion
        ? bottomNavPanelReducedVariants
        : buildBottomNavPanelVariants(panel.direction),
    [panel.direction, reducedMotion]
  );

  const transition = useMemo(
    () =>
      reducedMotion
        ? bottomNavPanelReducedTransition
        : buildBottomNavPanelTransition(fastMotion),
    [fastMotion, reducedMotion]
  );

  const handleAnimationStart = useCallback(() => {
    setAnimating(true);
  }, []);

  const handleAnimationComplete = useCallback(
    (definition: string | string[]) => {
      const name = Array.isArray(definition) ? definition[0] : definition;
      if (name === "animate") {
        setAnimating(false);
        onEnterComplete();
      }
      if (name === "exit") {
        setAnimating(false);
      }
    },
    [onEnterComplete]
  );

  return (
    <div className="page-transition page-transition--bottom-nav-panel">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={motionKey}
          layout={false}
          className={[
            "page-transition__layer",
            "page-transition__layer--panel",
            animating ? "page-transition__layer--animating" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          variants={variants}
          initial="initial"
          animate="animate"
          {...(panel.enterOnly ? {} : { exit: "exit" as const })}
          transition={transition}
          onAnimationStart={handleAnimationStart}
          onAnimationComplete={handleAnimationComplete}
        >
          <div className="page-transition__content">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const BottomNavPanelTransition = memo(BottomNavPanelTransitionInner);
