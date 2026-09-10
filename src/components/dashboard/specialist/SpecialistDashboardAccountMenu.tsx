"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
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
      <FastActivateButton
        className="smoac-control dashboard-signout dashboard-signout--utility specialist-dash-account__signout"
        onActivate={onSignOut}
      >
        Sign out
      </FastActivateButton>
    </div>
  );
}
