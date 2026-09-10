"use client";

import { useEffect, useState } from "react";

import { FastActivateButton } from "@/components/ui/FastActivateButton";

const STALL_MS = 8_000;

interface DashboardLoadingStateProps {
  message?: string;
}

/**
 * Full-page dashboard wait. After a stall, offer reload so a hung hydrate
 * can never leave specialists on a black spinner with no way out.
 */
export function DashboardLoadingState({
  message = "Loading your dashboard…",
}: DashboardLoadingStateProps) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setStalled(true), STALL_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="dashboard-page dashboard-page--loading">
      <div className="dashboard-page__content dashboard-page__content--loading">
        <p className="dashboard-page__subtitle">{message}</p>
        {stalled ? (
          <FastActivateButton
            className="smoac-control dashboard-loading-retry"
            onActivate={() => window.location.reload()}
          >
            Retry
          </FastActivateButton>
        ) : null}
      </div>
    </div>
  );
}
