"use client";

import { cn } from "@/lib/utils";
import "@/styles/smoac-saving-mark.css";

interface SmoacSavingMarkProps {
  label?: string;
  className?: string;
}

/**
 * Clean spinning ring + label — used while profile photo crop uploads
 * and specialist application submit.
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
      <span className="smoac-saving-mark__ring" aria-hidden />
      <p className="smoac-saving-mark__label">{label}</p>
    </div>
  );
}
