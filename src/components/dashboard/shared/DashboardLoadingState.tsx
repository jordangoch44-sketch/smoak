"use client";

import { PageWaitState } from "@/components/brand/PageWaitState";

interface DashboardLoadingStateProps {
  message?: string;
}

/**
 * Full-page dashboard wait with the branded spinning ring. After a stall,
 * Retry is offered so a hung hydrate cannot look frozen with no way out.
 */
export function DashboardLoadingState({
  message = "Loading your dashboard",
}: DashboardLoadingStateProps) {
  return (
    <div className="dashboard-page dashboard-page--loading">
      <div className="dashboard-page__content dashboard-page__content--loading">
        <PageWaitState label={message} className="page-wait-state--embedded" />
      </div>
    </div>
  );
}
