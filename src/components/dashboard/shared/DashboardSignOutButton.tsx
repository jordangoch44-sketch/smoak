"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";

interface DashboardSignOutButtonProps {
  onClick: () => void;
  className?: string;
}

/** Minimal utility sign out — top-right of dashboard shells */
export function DashboardSignOutButton({
  onClick,
  className,
}: DashboardSignOutButtonProps) {
  return (
    <FastActivateButton
      className={cn("dashboard-signout dashboard-signout--utility", className)}
      onActivate={onClick}
    >
      Sign out
    </FastActivateButton>
  );
}
