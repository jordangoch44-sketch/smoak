"use client";

import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export type SmoacDirectoryLoaderPhase = "active" | "exit";

interface SmoacDirectoryLoaderProps {
  phase: SmoacDirectoryLoaderPhase;
  reducedMotion?: boolean;
  className?: string;
}

/**
 * Cinematic directory splash — Search → Explore route transition.
 */
export function SmoacDirectoryLoader({
  phase,
  reducedMotion = false,
  className,
}: SmoacDirectoryLoaderProps) {
  const isActive = phase === "active";

  return (
    <div
      className={cn(
        "smoac-cinematic-loader",
        isActive && "smoac-cinematic-loader--active",
        phase === "exit" && "smoac-cinematic-loader--exit",
        reducedMotion && "smoac-cinematic-loader--reduced",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "exit"}
      aria-label="Loading specialists"
    >
      <div className="smoac-cinematic-loader__atmosphere" aria-hidden>
        <div className="smoac-cinematic-loader__gradient" />
        <div className="smoac-cinematic-loader__ambient" />
        <div className="smoac-cinematic-loader__fog smoac-cinematic-loader__fog--one" />
        <div className="smoac-cinematic-loader__fog smoac-cinematic-loader__fog--two" />
        <div className="smoac-cinematic-loader__streak" />
        <div className="smoac-cinematic-loader__grain" />
      </div>

      <div className="smoac-cinematic-loader__stage">
        <div className="smoac-cinematic-loader__logo-wrap">
          <div className="smoac-cinematic-loader__logo-bloom" aria-hidden />
          <Logo
            href={null}
            size="lg"
            priority
            markOnly
            className="smoac-cinematic-loader__logo"
          />
        </div>
        <p className="smoac-cinematic-loader__tagline">
          Number One Fitness Directory
        </p>
      </div>

      <p className="sr-only">SMOAC. Number One Fitness Directory.</p>
    </div>
  );
}
