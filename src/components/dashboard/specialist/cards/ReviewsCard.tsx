"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Trainer } from "@/types";
import {
  DashboardButton,
  DashboardCollapsibleSection,
  DashboardComingSoonModal,
  PremiumLockedValues,
} from "@/components/dashboard/shared";
import { LOGO_SRC } from "@/lib/brand";
import { copyTextToClipboard } from "@/lib/profile-share";
import { buildLeaveReviewAbsoluteUrl } from "@/lib/reviews/leave-review-href";
import {
  buildSpecialistReputationHub,
  formatReputationRating,
} from "@/lib/specialist-reputation";
import {
  ReputationReviewFeedItem,
  ReputationSourceRow,
} from "@/components/dashboard/specialist/reviews";
import { disputeReviewMailto } from "@/lib/site-contact";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const COPY_FLASH_MS = 2500;

interface ReviewsCardProps {
  trainer: Trainer | undefined;
  isPremium: boolean;
  /** Live SMOAC client review average (not Google/catalog ★) */
  smoacRating?: number | null;
  smoacReviewCount?: number;
  defaultOpen?: boolean;
}

export function ReviewsCard({
  trainer,
  isPremium,
  smoacRating = null,
  smoacReviewCount,
  defaultOpen = false,
}: ReviewsCardProps) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectSourceLabel, setConnectSourceLabel] = useState("Reviews");
  const [copiedReview, setCopiedReview] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  const profileId = trainer?.id ?? "";
  const hub = useMemo(
    () => buildSpecialistReputationHub(profileId, trainer),
    [profileId, trainer]
  );

  const reviewCount = smoacReviewCount ?? hub.totalReviewCount;
  const rating =
    smoacRating != null && smoacRating > 0
      ? smoacRating
      : hub.overallRating > 0
        ? hub.overallRating
        : null;
  const hasReviews = reviewCount > 0 && rating != null;
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

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyReviewLink = useCallback(async () => {
    if (!profileId) return;
    try {
      await copyTextToClipboard(buildLeaveReviewAbsoluteUrl(profileId));
      setCopiedReview(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedReview(false), COPY_FLASH_MS);
      showToast({
        type: "success",
        message: "Review link copied. Send it to clients to collect reviews.",
      });
    } catch {
      showToast({
        type: "info",
        message: "Could not copy link to clipboard.",
      });
    }
  }, [profileId, showToast]);

  function handleConnect(sourceId: string) {
    const source = hub.sources.find((entry) => entry.sourceId === sourceId);
    setConnectSourceLabel(source?.sourceName ?? "Reviews");
    setConnectModalOpen(true);
  }

  const summary = hasReviews
    ? `${reviewCount} review${reviewCount === 1 ? "" : "s"} · ★ ${formatReputationRating(rating)}`
    : "No reviews yet";

  const disputeHref = disputeReviewMailto({
    specialistName: trainer?.name,
    specialistId: profileId || undefined,
  });

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
        summary={summary}
        defaultOpen={defaultOpen}
        span="full"
        className={cn(
          "dashboard-smoac-reviews-card dashboard-reputation dashboard-glass-premium dashboard-glow-border",
          isPremium && "dashboard-reputation--premium"
        )}
      >
        <div className="dashboard-reputation__ambient" aria-hidden />

        <div className="dashboard-reputation__body">
          <div className="dashboard-reputation__hero">
            <div className="dashboard-reputation__stat dashboard-reputation__stat--rating">
              <span className="dashboard-reputation__stat-label">Average</span>
              <p className="dashboard-reputation__stat-value">
                {hasReviews ? formatReputationRating(rating) : "—"}
              </p>
              <span className="dashboard-reputation__stat-glyph" aria-hidden>
                ★
              </span>
            </div>
            <div className="dashboard-reputation__stat">
              <span className="dashboard-reputation__stat-label">Reviews</span>
              <p className="dashboard-reputation__stat-value">{reviewCount}</p>
            </div>
          </div>

          <div className="dashboard-reputation__actions">
            <DashboardButton
              type="button"
              disabled={!profileId}
              aria-label={
                copiedReview ? "Review link copied" : "Get more reviews"
              }
              onClick={() => void handleCopyReviewLink()}
            >
              {copiedReview ? "Copied!" : "Get more reviews"}
            </DashboardButton>
            <a
              href={disputeHref}
              className="dashboard-secondary-btn smoac-control"
            >
              Dispute a review
            </a>
          </div>
          <p className="dashboard-reputation__actions-hint">
            Send clients a review link, or email support if a review looks unfair.
          </p>

          {!hasReputation ? (
            <p className="dashboard-section__desc">
              Client reviews left on SMOAC show up here.
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
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
