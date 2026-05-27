"use client";

import { useMemo, useState } from "react";
import type { Trainer } from "@/types";
import {
  DashboardComingSoonModal,
  PremiumLockedValues,
} from "@/components/dashboard/shared";
import {
  buildSpecialistReputationHub,
  formatReputationRating,
} from "@/lib/specialist-reputation";
import {
  ReputationReviewFeedItem,
  ReputationSourceRow,
} from "@/components/dashboard/specialist/reviews";
import { cn } from "@/lib/utils";

interface ReviewsCardProps {
  trainer: Trainer | undefined;
  isPremium: boolean;
}

export function ReviewsCard({ trainer, isPremium }: ReviewsCardProps) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectSourceLabel, setConnectSourceLabel] = useState("Reviews");

  const profileId = trainer?.id ?? "";
  const hub = useMemo(
    () => buildSpecialistReputationHub(profileId, trainer),
    [profileId, trainer]
  );

  const hasReputation = hub.totalReviewCount > 0 || hub.latestReviews.length > 0;
  const connectedSources = hub.sources.filter(
    (source) => source.connectedStatus === "connected"
  );
  const disconnectedSources = hub.sources.filter(
    (source) => source.connectedStatus !== "connected"
  );

  function handleConnect(sourceId: string) {
    const source = hub.sources.find((entry) => entry.sourceId === sourceId);
    setConnectSourceLabel(source?.sourceName ?? "Reviews");
    setConnectModalOpen(true);
  }

  return (
    <>
      <section
        className={cn(
          "dashboard-reputation dashboard-section dashboard-glass-premium dashboard-glow-border",
          isPremium && "dashboard-reputation--premium"
        )}
        aria-labelledby="dashboard-reputation-title"
      >
        <div className="dashboard-reputation__ambient" aria-hidden />
        <header className="dashboard-reputation__header">
          <div>
            <h2 id="dashboard-reputation-title" className="dashboard-reputation__title">
              Reviews
            </h2>
            <p className="dashboard-reputation__subtitle">
              Aggregated client feedback across connected platforms.
            </p>
          </div>
        </header>

        {!hasReputation ? (
          <p className="dashboard-section__desc">
            Connect review sources to build your reputation hub.
          </p>
        ) : (
          <div className="dashboard-reputation__body">
            <div className="dashboard-reputation__hero">
              <div className="dashboard-reputation__stat dashboard-reputation__stat--rating">
                <span className="dashboard-reputation__stat-label">Overall rating</span>
                <p className="dashboard-reputation__stat-value">
                  {formatReputationRating(hub.overallRating)}
                </p>
                <span className="dashboard-reputation__stat-glyph" aria-hidden>
                  ★
                </span>
              </div>
              <div className="dashboard-reputation__stat dashboard-reputation__stat--count">
                <span className="dashboard-reputation__stat-label">Total reviews</span>
                <p className="dashboard-reputation__stat-value">{hub.totalReviewCount}</p>
              </div>
            </div>

            <PremiumLockedValues locked={!isPremium}>
              <div className="dashboard-reputation__sources">
                <p className="dashboard-reputation__sources-label">By source</p>
                <ul className="dashboard-reputation__sources-list">
                  {connectedSources.map((source) => (
                    <li key={source.sourceId}>
                      <ReputationSourceRow source={source} />
                    </li>
                  ))}
                </ul>
              </div>
            </PremiumLockedValues>

            {disconnectedSources.length > 0 ? (
              <ul className="dashboard-reputation__connect-list">
                {disconnectedSources.map((source) => (
                  <li key={source.sourceId}>
                    <ReputationSourceRow
                      source={source}
                      onConnect={handleConnect}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {hub.latestReviews.length > 0 ? (
              <div className="dashboard-reputation__feed">
                <p className="dashboard-reputation__feed-label">Latest reviews</p>
                <PremiumLockedValues locked={!isPremium}>
                  <div className="dashboard-reputation__feed-list">
                    {hub.latestReviews.map((review) => (
                      <ReputationReviewFeedItem key={review.id} review={review} />
                    ))}
                  </div>
                </PremiumLockedValues>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <DashboardComingSoonModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={`Connect ${connectSourceLabel}`}
        description="Review source connections are coming soon. You'll be able to link Google, Yelp, and other platforms so all feedback appears in one reputation hub."
      />
    </>
  );
}
