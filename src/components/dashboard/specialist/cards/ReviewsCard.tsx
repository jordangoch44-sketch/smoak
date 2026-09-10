"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Trainer } from "@/types";
import {
  DashboardCollapsibleSection,
  DashboardComingSoonModal,
  PremiumLockedValues,
} from "@/components/dashboard/shared";
import { LOGO_SRC } from "@/lib/brand";
import { buildSpecialistReputationHub } from "@/lib/specialist-reputation";
import {
  ReputationReviewFeedItem,
  ReputationSourceRow,
} from "@/components/dashboard/specialist/reviews";
import { cn } from "@/lib/utils";

interface ReviewsCardProps {
  trainer: Trainer | undefined;
  isPremium: boolean;
  defaultOpen?: boolean;
}

export function ReviewsCard({
  trainer,
  isPremium,
  defaultOpen = false,
}: ReviewsCardProps) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectSourceLabel, setConnectSourceLabel] = useState("Reviews");

  const profileId = trainer?.id ?? "";
  const hub = useMemo(
    () => buildSpecialistReputationHub(profileId, trainer),
    [profileId, trainer]
  );

  const hasReputation =
    hub.totalReviewCount > 0 || hub.latestReviews.length > 0;
  const connectedSources = hub.sources.filter(
    (source) =>
      source.sourceId !== "google" && source.connectedStatus === "connected"
  );
  const disconnectedSources = hub.sources.filter(
    (source) =>
      source.sourceId !== "google" && source.connectedStatus !== "connected"
  );

  function handleConnect(sourceId: string) {
    const source = hub.sources.find((entry) => entry.sourceId === sourceId);
    setConnectSourceLabel(source?.sourceName ?? "Reviews");
    setConnectModalOpen(true);
  }

  return (
    <>
      <DashboardCollapsibleSection
        title="SMOAC Reviews"
        icon={
          <Image
            src={LOGO_SRC}
            alt=""
            width={18}
            height={18}
            className="dashboard-accordion__brand-mark"
          />
        }
        description="SMOAC client reviews from people who found you on the marketplace."
        summary={
          hub.totalReviewCount > 0
            ? `${hub.totalReviewCount} reviews`
            : undefined
        }
        defaultOpen={defaultOpen}
        span="full"
        className={cn(
          "dashboard-smoac-reviews-card dashboard-reputation dashboard-glass-premium dashboard-glow-border",
          isPremium && "dashboard-reputation--premium"
        )}
      >
        <div className="dashboard-reputation__ambient" aria-hidden />

        {!hasReputation ? (
          <p className="dashboard-section__desc">
            Client reviews left on SMOAC show up here.
          </p>
        ) : (
          <div className="dashboard-reputation__body">
            <PremiumLockedValues locked={!isPremium}>
              <div className="dashboard-reputation__sources">
                <p className="dashboard-reputation__sources-label">Other sources</p>
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
                      <ReputationReviewFeedItem
                        key={review.id}
                        review={review}
                      />
                    ))}
                  </div>
                </PremiumLockedValues>
              </div>
            ) : null}
          </div>
        )}
      </DashboardCollapsibleSection>

      <DashboardComingSoonModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={`Connect ${connectSourceLabel}`}
        description="Other review source connections are coming soon."
      />
    </>
  );
}
