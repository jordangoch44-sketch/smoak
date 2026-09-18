"use client";

import type { ReactNode } from "react";
import { MembershipUnlockPitch } from "@/components/dashboard/shared/MembershipUnlockPitch";

interface SpecialistLockedOverviewProps {
  restoreTrial?: boolean;
  onUnlock: () => void;
  children: ReactNode;
}

/**
 * Free Overview: real analytics stay readable underneath a light frost.
 * Unlock copy sits in a smoked glass panel over the darkened stage.
 */
export function SpecialistLockedOverview({
  restoreTrial = false,
  onUnlock,
  children,
}: SpecialistLockedOverviewProps) {
  return (
    <div className="specialist-overview-gate">
      <div className="specialist-overview-gate__stage" aria-hidden>
        {children}
      </div>
      <div className="specialist-overview-gate__overlay">
        <div
          className="specialist-overview-gate__card smoac-unlock-pitch"
          role="dialog"
          aria-labelledby="membership-unlock-title"
          aria-describedby="membership-unlock-desc"
        >
          <div
            className="dashboard-modal__glow dashboard-upgrade__glow dashboard-upgrade__glow--pro"
            aria-hidden
          />
          <MembershipUnlockPitch
            kind={restoreTrial ? "restore" : "pro"}
            onUnlock={onUnlock}
          />
        </div>
      </div>
    </div>
  );
}
