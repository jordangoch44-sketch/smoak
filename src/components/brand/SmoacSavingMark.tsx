"use client";

import { cn } from "@/lib/utils";
import "@/styles/smoac-saving-mark.css";

import { SmoacLoader } from "./SmoacLoader";

interface SmoacSavingMarkProps {
  label?: string;
  className?: string;
  size?: "default" | "compact";
  /** Parent already shows the copy — keep the mark only. */
  hideLabel?: boolean;
  /** 0–100 when the wait is a measured upload. Omit for an unknown wait. */
  progress?: number | null;
}

/**
 * Branded wait used for photo upload, specialist submit, and other
 * multi-second waits (location, inquiry, checkout).
 */
export function SmoacSavingMark({
  label = "Uploading",
  className,
  size = "default",
  hideLabel = false,
  progress = null,
}: SmoacSavingMarkProps) {
  return (
    <SmoacLoader
      className={cn(className)}
      size={size === "compact" ? "small" : "large"}
      label={label}
      showLabel={!hideLabel}
      progress={progress}
    />
  );
}

interface SmoacSavingOverlayProps {
  label: string;
  className?: string;
  progress?: number | null;
}

/** Dims a `position: relative` parent and centers the branded loader. */
export function SmoacSavingOverlay({
  label,
  className,
  progress = null,
}: SmoacSavingOverlayProps) {
  return (
    <div
      className={cn("smoac-saving-overlay", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <SmoacSavingMark label={label} progress={progress} />
    </div>
  );
}
