"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import { WelcomeHyperspaceField } from "./WelcomeHyperspaceField";

export type SmoacWelcomeIntroVariant = "site" | "join";

const INTRO_TIMING: Record<
  SmoacWelcomeIntroVariant,
  { fadeIn: number; hold: number; fadeOut: number; logoAt?: number }
> = {
  /* Warp → logo → drop out of light-speed into homepage */
  site: { fadeIn: 900, hold: 1800, fadeOut: 1200, logoAt: 900 },
  join: { fadeIn: 320, hold: 650, fadeOut: 320 },
};

type IntroPhase = "enter" | "visible" | "exit";

interface SmoacWelcomeIntroProps {
  variant?: SmoacWelcomeIntroVariant;
  onComplete: () => void;
  /** Fired when intro content is on screen — gate uses this before blocking chrome */
  onVisible?: () => void;
  /** Fired when light-speed begins braking — homepage should become visible underneath */
  onArrive?: () => void;
}

export function SmoacWelcomeIntro({
  variant = "join",
  onComplete,
  onVisible,
  onArrive,
}: SmoacWelcomeIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { fadeIn, hold, fadeOut, logoAt = fadeIn } = INTRO_TIMING[variant];
  const [phase, setPhase] = useState<IntroPhase>("enter");
  const [logoVisible, setLogoVisible] = useState(false);
  const completedRef = useRef(false);
  const arriveFiredRef = useRef(false);
  const isSite = variant === "site";
  const useWarp = isSite && !reducedMotion;

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
      onVisible?.();
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
  }, [
    fadeIn,
    hold,
    fadeOut,
    logoAt,
    finish,
    beginExit,
    reducedMotion,
    onVisible,
  ]);

  /* Any browse gesture ends the site warp immediately — never trap scroll */
  useEffect(() => {
    if (!isSite) return;
    const end = () => finish();
    window.addEventListener("wheel", end, { passive: true });
    window.addEventListener("touchmove", end, { passive: true });
    window.addEventListener("keydown", end);
    return () => {
      window.removeEventListener("wheel", end);
      window.removeEventListener("touchmove", end);
      window.removeEventListener("keydown", end);
    };
  }, [isSite, finish]);

  const motionMs = reducedMotion ? 220 : isSite ? 900 : fadeIn;

  return (
    <div
      className={cn(
        "login-page login-page--intro smoac-welcome-intro",
        isSite && "smoac-welcome-intro--site",
        phase === "exit" && useWarp && "smoac-welcome-intro--arriving"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="smoac-welcome-title"
      aria-busy={phase !== "exit"}
    >
      <div className="login-page__canvas" aria-hidden>
        {useWarp ? (
          <>
            <WelcomeHyperspaceField
              exiting={phase === "exit"}
              className="smoac-welcome-intro__hyperspace"
            />
            <div className="smoac-welcome-intro__warp-vignette" />
          </>
        ) : isSite ? (
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

      {useWarp ? null : (
        <div className="create-account-intro__glass" aria-hidden />
      )}

      <div className="create-account-intro__stage">
        <div
          data-variant={variant}
          className={cn(
            "create-account-intro__content",
            useWarp && "create-account-intro__content--warp",
            (useWarp ? logoVisible : phase === "visible") &&
              "create-account-intro__content--visible",
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
            className={cn(
              "create-account-intro__logo",
              useWarp && "create-account-intro__logo--warp"
            )}
          />
          {useWarp ? (
            <>
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
            </>
          ) : (
            <>
              <h1 id="smoac-welcome-title" className="create-account-intro__title">
                Welcome to SMOAC
              </h1>
              <p className="create-account-intro__subtitle">
                The #1 Fitness Directory
              </p>
            </>
          )}
          {isSite && !useWarp ? (
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
        Welcome to SMOAC. Find your fitness professional anywhere.
      </p>
    </div>
  );
}
