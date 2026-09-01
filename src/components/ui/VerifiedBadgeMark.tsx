"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface VerifiedBadgeMarkProps {
  className?: string;
  iconClassName?: string;
  title?: string;
  size?: number | string;
}

const ROSETTE_PATH =
  "M 10.758 1.864 Q 12.000 1.000 13.242 1.864 Q 14.485 2.727 15.992 2.600 Q 17.500 2.474 18.144 3.843 Q 18.788 5.212 20.157 5.856 Q 21.526 6.500 21.400 8.008 Q 21.273 9.515 22.136 10.758 Q 23.000 12.000 22.136 13.242 Q 21.273 14.485 21.400 15.992 Q 21.526 17.500 20.157 18.144 Q 18.788 18.788 18.144 20.157 Q 17.500 21.526 15.992 21.400 Q 14.485 21.273 13.242 22.136 Q 12.000 23.000 10.758 22.136 Q 9.515 21.273 8.008 21.400 Q 6.500 21.526 5.856 20.157 Q 5.212 18.788 3.843 18.144 Q 2.474 17.500 2.600 15.992 Q 2.727 14.485 1.864 13.242 Q 1.000 12.000 1.864 10.758 Q 2.727 9.515 2.600 8.008 Q 2.474 6.500 3.843 5.856 Q 5.212 5.212 5.856 3.843 Q 6.500 2.474 8.008 2.600 Q 9.515 2.727 10.758 1.864 Z";

/**
 * Luxury smoke-spectrum verified seal — shared Pro mark across cards and profile.
 * 12-point precision starburst rosette filled with official SMOAK spectrum gradient
 * and accented with a luxury metallic bevel rim, ambient radiance, and crisp white checkmark.
 */
export function VerifiedBadgeMark({
  className,
  iconClassName,
  title = "Verified Pro specialist",
  size,
}: VerifiedBadgeMarkProps) {
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9-_]/g, "");
  const gradId = `smoac-badge-grad-${safeId}`;
  const rimId = `smoac-badge-rim-${safeId}`;
  const sheenId = `smoac-badge-sheen-${safeId}`;
  const shadowId = `smoac-badge-shadow-${safeId}`;

  const style = size ? { width: size, height: size } : undefined;

  return (
    <span
      className={cn("verified-badge-mark", className)}
      title={title}
      aria-label={title}
      style={style}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("verified-badge-mark__svg", iconClassName)}
        aria-hidden="true"
      >
        <defs>
          {/* Official SMOAK / SMOAC smoke color gradient: warm -> rose -> violet -> indigo -> cool */}
          <linearGradient
            id={gradId}
            x1="12%"
            y1="8%"
            x2="88%"
            y2="92%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF6B4A" />
            <stop offset="28%" stopColor="#F472B6" />
            <stop offset="52%" stopColor="#A855F7" />
            <stop offset="78%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>

          {/* Luxury beveled metallic rim */}
          <linearGradient
            id={rimId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.55" />
          </linearGradient>

          {/* Subtle upper glass sheen */}
          <radialGradient
            id={sheenId}
            cx="50%"
            cy="28%"
            r="65%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </radialGradient>

          {/* Checkmark subtle under-shadow */}
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0.8"
              stdDeviation="0.8"
              floodColor="#000000"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        {/* 12-point smooth luxury starburst medallion base */}
        <path
          d={ROSETTE_PATH}
          fill={`url(#${gradId})`}
          stroke={`url(#${rimId})`}
          strokeWidth="0.75"
          strokeLinejoin="round"
        />

        {/* Soft upper glass / light sheen layer */}
        <path
          d={ROSETTE_PATH}
          fill={`url(#${sheenId})`}
          stroke="none"
          opacity="0.9"
        />

        {/* Inner depth ring */}
        <circle
          cx="12"
          cy="12"
          r="8.3"
          fill="rgba(255, 255, 255, 0.06)"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="0.5"
        />

        {/* Clean, centered frosted white checkmark */}
        <path
          d="M7.4 12.2L10.4 15.2L16.6 8.8"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${shadowId})`}
        />
      </svg>
    </span>
  );
}
