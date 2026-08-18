"use client";

import { cn } from "@/lib/utils";
import "@/styles/smoac-saving-mark.css";

interface SmoacSavingMarkProps {
  label?: string;
  className?: string;
  size?: "default" | "compact";
  /** Parent already shows the copy — keep the ring only. */
  hideLabel?: boolean;
}

/**
 * Clean spinning ring + label — photo upload, specialist submit, and
 * other 2s+ waits (location, inquiry, Google Reviews).
 */
export function SmoacSavingMark({
  label = "Uploading",
  className,
  size = "default",
  hideLabel = false,
}: SmoacSavingMarkProps) {
  return (
    <div
      className={cn(
        "smoac-saving-mark",
        size === "compact" && "smoac-saving-mark--compact",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="smoac-saving-mark__ring" aria-hidden />
      {hideLabel ? null : (
        <p className="smoac-saving-mark__label">{label}</p>
      )}
    </div>
  );
}

interface SmoacSavingOverlayProps {
  label: string;
  className?: string;
}

/** Dims a `position: relative` parent and centers the green ring. */
export function SmoacSavingOverlay({
  label,
  className,
}: SmoacSavingOverlayProps) {
  return (
    <div
      className={cn("smoac-saving-overlay", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <SmoacSavingMark label={label} />
    </div>
  );
}
