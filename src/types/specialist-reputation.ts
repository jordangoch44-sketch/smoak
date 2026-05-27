/** Connected review platform identifier — extend for new sources */
export type ReputationSourceId = "smoac" | "google" | "yelp" | (string & {});

export type ReputationConnectionStatus = "connected" | "disconnected" | "pending";

/** Per-platform summary for the reputation hub */
export interface ReputationSourceSummary {
  sourceId: ReputationSourceId;
  sourceName: string;
  totalReviews: number;
  averageRating: number | null;
  connectedStatus: ReputationConnectionStatus;
  connectCtaLabel?: string;
  profileUrl?: string;
}

/** Unified review item across all platforms */
export interface AggregatedReview {
  id: string;
  profileId: string;
  source: ReputationSourceId;
  reviewerName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
  relativeTime?: string;
  sourceReviewUrl?: string;
  isVerified?: boolean;
}

/** Specialist dashboard reputation overview */
export interface SpecialistReputationHub {
  profileId: string;
  totalReviewCount: number;
  overallRating: number;
  sources: ReputationSourceSummary[];
  latestReviews: AggregatedReview[];
}

export interface ReputationSourceDefinition {
  sourceId: ReputationSourceId;
  sourceName: string;
  badgeLabel: string;
}
