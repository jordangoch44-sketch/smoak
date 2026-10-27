import { useId } from "react";

import { cn } from "@/lib/utils";
import "@/styles/smoac-loader.css";

import {
  SMOAC_LOADER_LOWER_LENGTH,
  SMOAC_LOADER_LOWER_LINE,
  SMOAC_LOADER_LOWER_OUTLINE,
  SMOAC_LOADER_STAR,
  SMOAC_LOADER_STAR_HEIGHT,
  SMOAC_LOADER_STAR_SRC,
  SMOAC_LOADER_STAR_WIDTH,
  SMOAC_LOADER_STAR_X,
  SMOAC_LOADER_STAR_Y,
  SMOAC_LOADER_STROKE_WIDTH,
  SMOAC_LOADER_UPPER_LENGTH,
  SMOAC_LOADER_UPPER_LINE,
  SMOAC_LOADER_UPPER_OUTLINE,
  SMOAC_LOADER_VIEWBOX,
} from "./smoac-loader-mark";

export type SmoacLoaderSize = "small" | "medium" | "large";

interface SmoacLoaderProps {
  size?: SmoacLoaderSize;
  /** Visible caption and accessible name. Defaults to "Loading". */
  label?: string;
  /** Keep the accessible name without rendering the caption. */
  showLabel?: boolean;
  /**
   * Measured share of the work, 0–100. Omit when the wait has no known total
   * so the mark keeps drawing instead of inventing a number.
   */
  progress?: number | null;
  className?: string;
}

/**
 * Branded wait mark. The S draws along the real logo, then the star sparks.
 * Sizes: 24px buttons, 48px sections, 80px full-page and modal waits.
 */
export function SmoacLoader({
  size = "large",
  label = "Loading",
  showLabel = true,
  progress = null,
  className,
}: SmoacLoaderProps) {
  const rawId = useId().replace(/:/g, "");
  const upperClipId = `smoac-loader-upper-${rawId}`;
  const lowerClipId = `smoac-loader-lower-${rawId}`;
  const starId = `smoac-loader-star-${rawId}`;
  const meter =
    progress == null || !Number.isFinite(progress)
      ? null
      : Math.max(0, Math.min(100, progress));
  const ratio = meter == null ? 0 : meter / 100;
  const strokeTotal = SMOAC_LOADER_UPPER_LENGTH + SMOAC_LOADER_LOWER_LENGTH;
  const upperShare = SMOAC_LOADER_UPPER_LENGTH / strokeTotal;
  const upperDone = Math.min(1, ratio / upperShare);
  const lowerDone =
    ratio <= upperShare ? 0 : (ratio - upperShare) / (1 - upperShare);
  const percentLabel = meter == null ? null : `${Math.round(meter)}%`;

  return (
    <div
      className={cn(
        "smoac-loader",
        `smoac-loader--${size}`,
        meter != null && "smoac-loader--metered",
        className
      )}
      role={meter == null ? "status" : "progressbar"}
      aria-live={meter == null ? "polite" : "off"}
      aria-busy="true"
      aria-valuemin={meter == null ? undefined : 0}
      aria-valuemax={meter == null ? undefined : 100}
      aria-valuenow={meter == null ? undefined : Math.round(meter)}
      aria-label={percentLabel ? `${label}, ${percentLabel}` : label}
    >
      <svg
        className="smoac-loader__svg"
        viewBox={SMOAC_LOADER_VIEWBOX}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={upperClipId}>
            <path d={SMOAC_LOADER_UPPER_OUTLINE} />
          </clipPath>
          <clipPath id={lowerClipId}>
            <path d={SMOAC_LOADER_LOWER_OUTLINE} />
          </clipPath>
          <clipPath id={starId}>
            <path d={SMOAC_LOADER_STAR} />
          </clipPath>
        </defs>
        <g className="smoac-loader__cycle">
          <path className="smoac-loader__ghost" d={SMOAC_LOADER_UPPER_OUTLINE} />
          <path className="smoac-loader__ghost" d={SMOAC_LOADER_LOWER_OUTLINE} />
          <g clipPath={`url(#${upperClipId})`}>
            <path
              className="smoac-loader__draw smoac-loader__draw--upper"
              d={SMOAC_LOADER_UPPER_LINE}
              pathLength={SMOAC_LOADER_UPPER_LENGTH}
              strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
              style={
                meter == null
                  ? undefined
                  : {
                      strokeDasharray: SMOAC_LOADER_UPPER_LENGTH,
                      strokeDashoffset:
                        SMOAC_LOADER_UPPER_LENGTH * (1 - upperDone),
                    }
              }
            />
            <path
              className="smoac-loader__streak smoac-loader__streak--upper"
              d={SMOAC_LOADER_UPPER_LINE}
              pathLength={SMOAC_LOADER_UPPER_LENGTH}
              strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
            />
          </g>
          <g clipPath={`url(#${lowerClipId})`}>
            <path
              className="smoac-loader__draw smoac-loader__draw--lower"
              d={SMOAC_LOADER_LOWER_LINE}
              pathLength={SMOAC_LOADER_LOWER_LENGTH}
              strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
              style={
                meter == null
                  ? undefined
                  : {
                      strokeDasharray: SMOAC_LOADER_LOWER_LENGTH,
                      strokeDashoffset:
                        SMOAC_LOADER_LOWER_LENGTH * (1 - lowerDone),
                    }
              }
            />
            <path
              className="smoac-loader__streak smoac-loader__streak--lower"
              d={SMOAC_LOADER_LOWER_LINE}
              pathLength={SMOAC_LOADER_LOWER_LENGTH}
              strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
            />
          </g>
          <g
            className={cn(
              "smoac-loader__star",
              meter != null && meter >= 100 && "smoac-loader__star--on"
            )}
          >
            <image
              href={SMOAC_LOADER_STAR_SRC}
              x={SMOAC_LOADER_STAR_X}
              y={SMOAC_LOADER_STAR_Y}
              width={SMOAC_LOADER_STAR_WIDTH}
              height={SMOAC_LOADER_STAR_HEIGHT}
              clipPath={`url(#${starId})`}
            />
          </g>
        </g>
      </svg>
      {showLabel && label ? (
        <p className="smoac-loader__label">{label}</p>
      ) : null}
      {percentLabel ? (
        <p className="smoac-loader__percent">{percentLabel}</p>
      ) : null}
    </div>
  );
}
