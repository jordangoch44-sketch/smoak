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
  className,
}: SmoacLoaderProps) {
  const rawId = useId().replace(/:/g, "");
  const upperClipId = `smoac-loader-upper-${rawId}`;
  const lowerClipId = `smoac-loader-lower-${rawId}`;
  const starId = `smoac-loader-star-${rawId}`;

  return (
    <div
      className={cn("smoac-loader", `smoac-loader--${size}`, className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
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
            />
            <path
              className="smoac-loader__streak smoac-loader__streak--lower"
              d={SMOAC_LOADER_LOWER_LINE}
              pathLength={SMOAC_LOADER_LOWER_LENGTH}
              strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
            />
          </g>
          <g className="smoac-loader__star">
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
    </div>
  );
}
