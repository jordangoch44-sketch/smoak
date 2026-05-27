"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

export type SmoacWelcomeIntroVariant = "site" | "join";

const INTRO_TIMING: Record<
  SmoacWelcomeIntroVariant,
  { fadeIn: number; hold: number; fadeOut: number }
> = {
  site: { fadeIn: 280, hold: 450, fadeOut: 280 },
  join: { fadeIn: 320, hold: 650, fadeOut: 320 },
};

type IntroPhase = "enter" | "visible" | "exit";

interface SmoacWelcomeIntroProps {
  variant?: SmoacWelcomeIntroVariant;
  onComplete: () => void;
  /** Fired when intro content is on screen — gate uses this before blocking chrome */
  onVisible?: () => void;
}

export function SmoacWelcomeIntro({
  variant = "join",
  onComplete,
  onVisible,
}: SmoacWelcomeIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { fadeIn, hold, fadeOut } = INTRO_TIMING[variant];
  const [phase, setPhase] = useState<IntroPhase>("enter");
  const completedRef = useRef(false);
  const isSite = variant === "site";

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => {
      setPhase("visible");
      onVisible?.();
    });

    const effectiveHold = reducedMotion ? 280 : hold;
    const effectiveFadeIn = reducedMotion ? 220 : fadeIn;
    const effectiveFadeOut = reducedMotion ? 220 : fadeOut;

    const holdTimer = window.setTimeout(
      () => setPhase("exit"),
      effectiveFadeIn + effectiveHold
    );
    const doneTimer = window.setTimeout(
      finish,
      effectiveFadeIn + effectiveHold + effectiveFadeOut
    );

    return () => {
      cancelAnimationFrame(enterFrame);
      window.clearTimeout(holdTimer);
      window.clearTimeout(doneTimer);
    };
  }, [fadeIn, hold, fadeOut, finish, reducedMotion, onVisible]);

  const motionMs = reducedMotion ? 220 : fadeIn;

  return (
    <div
      className={cn(
        "login-page login-page--intro smoac-welcome-intro",
        isSite && "smoac-welcome-intro--site"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="smoac-welcome-title"
      aria-busy={phase !== "exit"}
    >
      <div className="login-page__canvas" aria-hidden>
        {isSite ? (
          <>
            <div className="smoac-welcome-intro__site-glow" />
            <div className="atmosphere-vignette atmosphere-vignette--soft wizard-vignette" />
          </>
        ) : (
          <>
            <div className="wizard-aurora-pool wizard-aurora-pool--primary" />
            <div className="wizard-aurora-pool wizard-aurora-pool--secondary" />
            <div className="atmosphere-mesh wizard-atmosphere-mesh">
              <div className="atmosphere-blob atmosphere-blob--indigo" />
              <div className="atmosphere-blob atmosphere-blob--blue" />
              <div className="atmosphere-blob atmosphere-blob--violet" />
              <div className="atmosphere-blob atmosphere-blob--magenta" />
              <div className="atmosphere-blob atmosphere-blob--core" />
            </div>
            <div className="login-page__card-glow wizard-card-glow" />
            <div className="atmosphere-vignette atmosphere-vignette--soft wizard-vignette" />
            <div className="atmosphere-grain" />
          </>
        )}
      </div>

      <div className="create-account-intro__glass" aria-hidden />

      <div className="create-account-intro__stage">
        <div
          data-variant={variant}
          className={cn(
            "create-account-intro__content",
            phase === "visible" && "create-account-intro__content--visible",
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
            className="create-account-intro__logo"
          />
          <h1 id="smoac-welcome-title" className="create-account-intro__title">
            Welcome to SMOAC
          </h1>
          <p className="create-account-intro__subtitle">
            The #1 Fitness Directory
          </p>
          {isSite ? (
            <button
              type="button"
              className="create-account-intro__continue smoac-control"
              onClick={finish}
            >
              Continue
            </button>
          ) : null}
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
        Welcome to SMOAC. The number one fitness directory.
      </p>
    </div>
  );
}
