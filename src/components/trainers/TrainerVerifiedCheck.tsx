"use client";

import { useId } from "react";
import { isTrainerVerified } from "@/lib/trainer-sponsorship";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface TrainerVerifiedCheckProps {
  trainer: Trainer;
  className?: string;
}

const LOBE_ANGLES = Array.from({ length: 12 }, (_, i) => -90 + i * 30);

/** Scalloped Pro verified mark — same entitlement rules, Instagram-style badge. */
export function TrainerVerifiedCheck({
  trainer,
  className,
}: TrainerVerifiedCheckProps) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `verified-badge-${rawId}`;

  if (!isTrainerVerified(trainer)) return null;

  return (
    <span
      className={cn("trainer-card__verified", className)}
      title="Verified Pro specialist"
      aria-label="Verified Pro specialist"
    >
      <svg
        className="trainer-card__verified-icon"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="12"
            y1="1.5"
            x2="12"
            y2="22.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#6B7CFF" />
            <stop offset="100%" stopColor="#2EE8FF" />
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          <circle cx="12" cy="12" r="8.85" />
          {LOBE_ANGLES.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={12 + Math.cos(rad) * 8.85}
                cy={12 + Math.sin(rad) * 8.85}
                r="2.55"
              />
            );
          })}
        </g>
        <path
          className="trainer-card__verified-tick"
          d="M7.55 12.2l3.05 3.15 6.05-6.7"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
