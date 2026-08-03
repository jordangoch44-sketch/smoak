"use client";

import { cn } from "@/lib/utils";

interface SmoacSavingMarkProps {
  label?: string;
  className?: string;
}

/**
 * Drawn “S” mark + label — used while profile photo crop uploads.
 * pathLength="1" keeps the stroke draw loop stable across browsers.
 */
export function SmoacSavingMark({
  label = "Uploading",
  className,
}: SmoacSavingMarkProps) {
  return (
    <div
      className={cn("smoac-saving-mark", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <svg
        className="smoac-saving-mark__svg"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
      >
        <path
          className="smoac-saving-mark__path"
          pathLength={1}
          d="M42.5 18.5c-2.4-3.2-6.4-5.2-11.2-5.2-8.2 0-14 4.8-14 11.6 0 5.6 3.6 8.8 11.4 11.2l3.2.9c6.2 1.8 8.8 3.8 8.8 7.6 0 4.4-3.8 7.4-9.6 7.4-4.6 0-8.4-1.8-11-5.4"
          stroke="currentColor"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="smoac-saving-mark__label">{label}</p>
    </div>
  );
}
