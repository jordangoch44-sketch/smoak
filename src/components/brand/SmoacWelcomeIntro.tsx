"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import { WelcomeHyperspaceField } from "./WelcomeHyperspaceField";

const SITE_INTRO_TIMING = {
  fadeIn: 900,
  hold: 1800,
  fadeOut: 1200,
  logoAt: 900,
};

type IntroPhase = "enter" | "visible" | "exit";

interface SmoacWelcomeIntroProps {
  onComplete: () => void;
  /** Fired when light-speed begins braking — homepage should become visible underneath */
  onArrive?: () => void;
}

export function SmoacWelcomeIntro({
  onComplete,
  onArrive,
}: SmoacWelcomeIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { fadeIn, hold, fadeOut, logoAt } = SITE_INTRO_TIMING;
  const [phase, setPhase] = useState<IntroPhase>("enter");
  const [logoVisible, setLogoVisible] = useState(false);
  const completedRef = useRef(false);
  const arriveFiredRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const beginExit = useCallback(() => {
    setPhase("exit");
    if (!arriveFiredRef.current) {
      arriveFiredRef.current = true;
      onArrive?.();
    }
  }, [onArrive]);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => {
      setPhase("visible");
    });

    const effectiveHold = reducedMotion ? 280 : hold;
    const effectiveFadeIn = reducedMotion ? 220 : fadeIn;
    const effectiveFadeOut = reducedMotion ? 220 : fadeOut;
    const effectiveLogoAt = reducedMotion ? 120 : logoAt;

    const logoTimer = window.setTimeout(
      () => setLogoVisible(true),
      effectiveLogoAt
    );
    const holdTimer = window.setTimeout(
      beginExit,
      effectiveFadeIn + effectiveHold
    );
    const doneTimer = window.setTimeout(
      finish,
      effectiveFadeIn + effectiveHold + effectiveFadeOut
    );

    return () => {
      cancelAnimationFrame(enterFrame);
      window.clearTimeout(logoTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(doneTimer);
    };
  }, [fadeIn, hold, fadeOut, logoAt, finish, beginExit, reducedMotion]);

  const motionMs = reducedMotion ? 220 : 900;

  return (
    <div
      className={cn(
        "login-page login-page--intro smoac-welcome-intro smoac-welcome-intro--site",
        phase === "exit" && "smoac-welcome-intro--arriving"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="smoac-welcome-title"
      aria-busy={phase !== "exit"}
    >
      <div className="login-page__canvas" aria-hidden>
        <WelcomeHyperspaceField
          exiting={phase === "exit"}
          className="smoac-welcome-intro__hyperspace"
        />
        <div className="smoac-welcome-intro__warp-vignette" />
      </div>

      <div className="create-account-intro__stage">
        <div
          data-variant="site"
          className={cn(
            "create-account-intro__content create-account-intro__content--warp",
            logoVisible && "create-account-intro__content--visible",
            phase === "exit" && "create-account-intro__content--exit",
            reducedMotion && "create-account-intro__content--reduced"
          )}
          style={{ transitionDuration: `${motionMs}ms` }}
        >
          <Logo
            href={null}
            size="lg"
            priority
            markOnly
            className="create-account-intro__logo create-account-intro__logo--warp"
          />
          <h1 id="smoac-welcome-title" className="sr-only">
            Welcome to SMOAC
          </h1>
          <p
            className={cn(
              "create-account-intro__warp-slogan",
              logoVisible && "create-account-intro__warp-slogan--visible",
              phase === "exit" && "create-account-intro__warp-slogan--exit"
            )}
            aria-hidden
          >
            Find your fitness professional anywhere
          </p>
        </div>
      </div>

      <button
        type="button"
        className="create-account-intro__skip sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white/10 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        onClick={finish}
      >
        Skip welcome
      </button>

      <p className="sr-only" role="status" aria-live="polite">
        Welcome to SMOAC. Find your fitness professional anywhere.
      </p>
    </div>
  );
}
