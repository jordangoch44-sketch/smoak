"use client";

import { useMemo, useState } from "react";
import type { Trainer } from "@/types";
import {
  DashboardCollapsibleSection,
  DashboardComingSoonModal,
  DashboardSectionIcon,
  PremiumLockedValues,
} from "@/components/dashboard/shared";
import { ConnectGoogleReviewsModal } from "@/components/dashboard/specialist/ConnectGoogleReviewsModal";
import {
  buildSpecialistReputationHub,
  formatReputationRating,
} from "@/lib/specialist-reputation";
import { readGooglePlaceSnapshotFromTrainer } from "@/lib/google-reviews-display";
import { refreshApprovedSpecialistProfilesFromRemote } from "@/lib/approved-specialist-profiles-store";
import {
  ReputationReviewFeedItem,
  ReputationSourceRow,
} from "@/components/dashboard/specialist/reviews";
import { cn } from "@/lib/utils";
import type { GooglePlaceSnapshot } from "@/lib/google-places";

interface ReviewsCardProps {
  trainer: Trainer | undefined;
  isPremium: boolean;
  onUpgrade?: () => void;
  onTrainerGoogleConnected?: (snapshot: GooglePlaceSnapshot) => void;
  defaultOpen?: boolean;
}

export function ReviewsCard({
  trainer,
  isPremium,
  onUpgrade,
  onTrainerGoogleConnected,
  defaultOpen = false,
}: ReviewsCardProps) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectSourceLabel, setConnectSourceLabel] = useState("Reviews");
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [localSnapshot, setLocalSnapshot] = useState<GooglePlaceSnapshot | null>(
    null
  );

  const profileId = trainer?.id ?? "";
  const hub = useMemo(
    () => buildSpecialistReputationHub(profileId, trainer),
    [profileId, trainer]
  );

  const googleFromTrainer = readGooglePlaceSnapshotFromTrainer(trainer);
  const googleConnected = Boolean(
    localSnapshot?.placeId || googleFromTrainer.connected
  );
  const googleRating =
    localSnapshot?.rating ?? googleFromTrainer.rating ?? null;
  const googleCount =
    localSnapshot?.reviewCount ?? googleFromTrainer.reviewCount ?? 0;

  const hasReputation =
    hub.totalReviewCount > 0 ||
    hub.latestReviews.length > 0 ||
    googleConnected;
  const connectedSources = hub.sources.filter(
    (source) =>
      source.sourceId !== "google" && source.connectedStatus === "connected"
  );
  const disconnectedSources = hub.sources.filter(
    (source) =>
      source.sourceId !== "google" && source.connectedStatus !== "connected"
  );

  function handleConnect(sourceId: string) {
    if (sourceId === "google") {
      if (!isPremium) {
        onUpgrade?.();
        return;
      }
      setGoogleModalOpen(true);
      return;
    }
    const source = hub.sources.find((entry) => entry.sourceId === sourceId);
    setConnectSourceLabel(source?.sourceName ?? "Reviews");
    setConnectModalOpen(true);
  }

  function handleGoogleConnected(snapshot: GooglePlaceSnapshot) {
    setLocalSnapshot(snapshot);
    onTrainerGoogleConnected?.(snapshot);
    refreshApprovedSpecialistProfilesFromRemote();
  }

  return (
    <>
      <DashboardCollapsibleSection
        title="Reviews"
        icon={<DashboardSectionIcon id="reviews" />}
        description="SMOAC client reviews stay free. Google rating sync is a Pro feature."
        summary={
          googleConnected
            ? `Google ★ ${googleRating != null ? formatReputationRating(googleRating) : "connected"}`
            : hub.totalReviewCount > 0
              ? `${hub.totalReviewCount} reviews`
              : "Connect sources"
        }
        defaultOpen={defaultOpen}
        span="full"
        className={cn(
          "dashboard-reputation dashboard-glass-premium dashboard-glow-border",
          isPremium && "dashboard-reputation--premium"
        )}
      >
        <div className="dashboard-reputation__ambient" aria-hidden />

        <div className="dashboard-reputation__google-cta">
          {googleConnected && isPremium ? (
            <div className="dashboard-reputation-source dashboard-reputation-source--connected">
              <div className="dashboard-reputation-source__lead">
                <span className="dashboard-reputation-source__name">Google</span>
                <span className="dashboard-reputation-source__count">
                  {googleCount} review{googleCount === 1 ? "" : "s"}
                </span>
              </div>
              {googleRating != null ? (
                <span className="dashboard-reputation-source__rating">
                  ★ {formatReputationRating(googleRating)}
                </span>
              ) : (
                <span className="dashboard-reputation-source__rating">Connected</span>
              )}
              <button
                type="button"
                className="dashboard-reputation-connect"
                onClick={() => setGoogleModalOpen(true)}
              >
                Update
              </button>
            </div>
          ) : (
            <div className="dashboard-reputation-source dashboard-reputation-source--disconnected">
              <div className="dashboard-reputation-source__lead">
                <span className="dashboard-reputation-source__name">
                  Google Reviews
                </span>
              </div>
              <button
                type="button"
                className="dashboard-reputation-connect"
                onClick={() => handleConnect("google")}
              >
                {isPremium ? "Connect Google Reviews" : "Unlock with Pro"}
              </button>
            </div>
          )}
        </div>

        {!hasReputation ? (
          <p className="dashboard-section__desc">
            Connect Google on Pro to show live stars on your public profile.
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

      <ConnectGoogleReviewsModal
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onConnected={handleGoogleConnected}
      />

      <DashboardComingSoonModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={`Connect ${connectSourceLabel}`}
        description="Other review source connections are coming soon. Google Reviews connect is available now on Pro."
      />
    </>
  );
}
