"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumLockedValuesProps {
  locked: boolean;
  children: ReactNode;
  className?: string;
}

/** Blurs metric values only — labels stay readable */
export function PremiumLockedValues({
  locked,
  children,
  className,
}: PremiumLockedValuesProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("dashboard-premium-lock__values", className)}
      aria-hidden
    >
      <div className="dashboard-premium-lock__values-inner">{children}</div>
      <div className="dashboard-premium-lock__values-veil" aria-hidden />
    </div>
  );
}
