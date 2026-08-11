"use client";

import { cn } from "@/lib/utils";

interface SpecialistDashboardAccountMenuProps {
  onSignOut: () => void;
  className?: string;
}

/** Top-right specialist utility — Sign out only (photo lives on Edit profile). */
export function SpecialistDashboardAccountMenu({
  onSignOut,
  className,
}: SpecialistDashboardAccountMenuProps) {
  return (
    <div className={cn("specialist-dash-account", className)}>
      <button
        type="button"
        className="smoac-control dashboard-signout dashboard-signout--utility specialist-dash-account__signout"
        onClick={onSignOut}
      >
        Sign out
      </button>
    </div>
  );
}
