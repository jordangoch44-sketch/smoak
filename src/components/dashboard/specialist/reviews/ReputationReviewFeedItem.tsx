import {
  getReputationSourceDisplayName,
} from "@/lib/specialist-reputation";
import type { AggregatedReview } from "@/types/specialist-reputation";
import { ReputationSourceBadge } from "./ReputationSourceBadge";

interface ReputationReviewFeedItemProps {
  review: AggregatedReview;
}

function truncateSnippet(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function ReputationReviewFeedItem({ review }: ReputationReviewFeedItemProps) {
  const sourceName = getReputationSourceDisplayName(review.source);
  const timeLabel = review.relativeTime ?? review.reviewDate;

  const content = (
    <>
      <div className="dashboard-reputation-feed__top">
        <p className="dashboard-reputation-feed__author">
          <span>{review.reviewerName}</span>
          <span className="dashboard-reputation-feed__stars" aria-label={`${review.rating} out of 5 stars`}>
            ★ {review.rating}
          </span>
        </p>
        <div className="dashboard-reputation-feed__meta">
          <ReputationSourceBadge sourceId={review.source} />
          <span className="dashboard-reputation-feed__source">{sourceName}</span>
          {review.isVerified ? (
            <span className="dashboard-reputation-feed__verified">Verified</span>
          ) : null}
        </div>
      </div>
      <blockquote className="dashboard-reputation-feed__quote">
        “{truncateSnippet(review.reviewText)}”
      </blockquote>
      <time className="dashboard-reputation-feed__time" dateTime={review.reviewDate}>
        {timeLabel}
      </time>
    </>
  );

  if (review.sourceReviewUrl) {
    return (
      <a
        href={review.sourceReviewUrl}
        className="dashboard-reputation-feed__item dashboard-reputation-feed__item--link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return <article className="dashboard-reputation-feed__item">{content}</article>;
}
