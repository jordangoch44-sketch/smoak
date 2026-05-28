"use client";

import { memo, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BottomNavPanelTransitionState } from "@/contexts/MobileBottomNavTransitionContext";
import {
  bottomNavPanelReducedTransition,
  bottomNavPanelReducedVariants,
  bottomNavPanelTransition,
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
  const reducedMotion = useReducedMotion();
  const variants = useMemo(
    () =>
      reducedMotion
        ? bottomNavPanelReducedVariants
        : buildBottomNavPanelVariants(panel.direction),
    [panel.direction, reducedMotion]
  );
  const transition = reducedMotion
    ? bottomNavPanelReducedTransition
    : bottomNavPanelTransition;

  return (
    <div className="page-transition page-transition--bottom-nav-panel">
      <AnimatePresence
        initial={false}
        mode={panel.enterOnly ? "sync" : "popLayout"}
      >
        <motion.div
          key={motionKey}
          className="page-transition__layer page-transition__layer--panel"
          variants={variants}
          initial="initial"
          animate="animate"
          {...(panel.enterOnly ? {} : { exit: "exit" as const })}
          transition={transition}
          onAnimationComplete={(definition) => {
            if (definition === "animate") onEnterComplete();
          }}
        >
          <div className="page-transition__content">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const BottomNavPanelTransition = memo(BottomNavPanelTransitionInner);
