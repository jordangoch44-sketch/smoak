"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MembershipUnlockPitch,
  UNLOCK_COLLAPSE_MS,
} from "@/components/dashboard/shared/MembershipUnlockPitch";
import { cn } from "@/lib/utils";

interface SpecialistLockedOverviewProps {
  restoreTrial?: boolean;
  /** Keep the collapsed spiral while the checkout overlay is covering this card. */
  holdUnlock?: boolean;
  /** Pending application — greyed analytics, no Pro unlock. */
  pending?: boolean;
  onUnlock?: () => void;
  children: ReactNode;
}

/**
 * Free Overview: real analytics stay readable underneath a light frost.
 * Unlock copy sits in a smoked glass panel over the darkened stage.
 */
export function SpecialistLockedOverview({
  restoreTrial = false,
  holdUnlock = false,
  pending = false,
  onUnlock,
  children,
}: SpecialistLockedOverviewProps) {
  const [unlocking, setUnlocking] = useState(false);
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (holdUnlock) return;
    setUnlocking(false);
  }, [holdUnlock]);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  function handleUnlock() {
    if (!onUnlock) return;
    if (unlocking) {
      onUnlock();
      return;
    }
    setUnlocking(true);
    unlockTimerRef.current = window.setTimeout(() => {
      onUnlock();
    }, UNLOCK_COLLAPSE_MS);
  }

  return (
    <div
      className={cn(
        "specialist-overview-gate",
        pending && "specialist-overview-gate--pending"
      )}
    >
      <div className="specialist-overview-gate__stage" aria-hidden>
        {children}
      </div>
      <div className="specialist-overview-gate__overlay">
        {pending ? (
          <div
            className="specialist-overview-gate__card specialist-overview-pending"
            role="status"
            aria-labelledby="specialist-overview-pending-title"
          >
            <h2
              id="specialist-overview-pending-title"
              className="specialist-overview-pending__title"
            >
              No information available until approval
            </h2>
          </div>
        ) : (
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
              busy={unlocking}
              onUnlock={handleUnlock}
            />
          </div>
        )}
      </div>
    </div>
  );
}
