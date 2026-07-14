import { cn } from "@/lib/utils";

export type AuroraAtmosphereIntensity = "subtle" | "soft" | "medium";
export type AuroraAtmosphereStarDensity = "none" | "sparse" | "light";
export type AuroraAtmosphereGlowPosition =
  | "none"
  | "hero"
  | "section-top"
  | "header"
  | "center"
  | "search";
export type AuroraAtmosphereGlowColor =
  | "purple"
  | "violet"
  | "blue"
  | "magenta"
  | "mixed";

export interface AuroraAtmosphereProps {
  intensity?: AuroraAtmosphereIntensity;
  starDensity?: AuroraAtmosphereStarDensity;
  glowPosition?: AuroraAtmosphereGlowPosition;
  glowColor?: AuroraAtmosphereGlowColor;
  enableMotion?: boolean;
  /** `absolute` fills a positioned parent; `fixed` for site-wide layers */
  mode?: "absolute" | "fixed";
  className?: string;
}

const CROSS_COUNT = 8;

/**
 * Subtle cosmic Aurora layer — organic stars + soft nebula glows.
 * Decorative only; keep intensity low so chrome and content stay primary.
 */
export function AuroraAtmosphere({
  intensity = "subtle",
  starDensity = "sparse",
  glowPosition = "none",
  glowColor = "mixed",
  enableMotion = true,
  mode = "absolute",
  className,
}: AuroraAtmosphereProps) {
  return (
    <div
      className={cn(
        "aurora-atmosphere",
        `aurora-atmosphere--${mode}`,
        `aurora-atmosphere--intensity-${intensity}`,
        `aurora-atmosphere--stars-${starDensity}`,
        `aurora-atmosphere--glow-${glowPosition}`,
        `aurora-atmosphere--color-${glowColor}`,
        enableMotion && "aurora-atmosphere--motion",
        className
      )}
      aria-hidden
    >
      {glowPosition !== "none" ? (
        <>
          <div className="aurora-atmosphere__nebula aurora-atmosphere__nebula--primary" />
          <div className="aurora-atmosphere__nebula aurora-atmosphere__nebula--secondary" />
          <div className="aurora-atmosphere__veil" />
        </>
      ) : null}

      {starDensity !== "none" ? (
        <div className="aurora-atmosphere__starfield">
          <div className="aurora-atmosphere__stars aurora-atmosphere__stars--distant" />
          <div className="aurora-atmosphere__stars aurora-atmosphere__stars--mid" />
          <div className="aurora-atmosphere__stars aurora-atmosphere__stars--glow" />
          <div className="aurora-atmosphere__crosses">
            {Array.from({ length: CROSS_COUNT }, (_, i) => (
              <span
                key={i}
                className={`aurora-atmosphere__cross aurora-atmosphere__cross--${i + 1}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
