"use client";

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
    <button
      type="button"
      className={cn("dashboard-signout dashboard-signout--utility", className)}
      onClick={onClick}
    >
      Sign out
    </button>
  );
}
