import type { ReactNode } from "react";
import { AuroraLight } from "@/components/ui/AuroraLight";
import { cn } from "@/lib/utils";
import "@/styles/aurora-page-header.css";

export interface AuroraPageHeaderProps {
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  /** Accent line under the copy. Defaults on. */
  showRule?: boolean;
  /** How strong the ribbon reads against the black. */
  intensity?: "soft" | "medium";
  className?: string;
  children?: ReactNode;
}

/**
 * Editorial header for Workouts, Profile, and Business.
 * The ribbon is decorative and does not receive touches.
 */
export function AuroraPageHeader({
  eyebrow,
  title,
  subtitle,
  showRule = true,
  intensity = "medium",
  className,
  children,
}: AuroraPageHeaderProps) {
  return (
    <header
      className={cn(
        "aurora-page-header",
        intensity === "soft" && "aurora-page-header--soft",
        className
      )}
    >
      <AuroraLight
        palette="spectrum"
        duration="28s"
        className="aurora-page-header__light"
      />
      <div className="aurora-page-header__body">
        {eyebrow ? <p className="aurora-page-header__eyebrow">{eyebrow}</p> : null}
        {title ? <h1 className="aurora-page-header__title">{title}</h1> : null}
        {subtitle ? <p className="aurora-page-header__subtitle">{subtitle}</p> : null}
        {children}
        {showRule ? <span className="aurora-page-header__rule" aria-hidden /> : null}
      </div>
    </header>
  );
}
