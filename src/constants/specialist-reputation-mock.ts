import type {
  AggregatedReview,
  ReputationSourceDefinition,
  ReputationSourceSummary,
} from "@/types/specialist-reputation";

/** Registry of known review sources — add entries here for new platforms */
export const REPUTATION_SOURCE_REGISTRY: ReputationSourceDefinition[] = [
  { sourceId: "smoac", sourceName: "SMOAC", badgeLabel: "S" },
  { sourceId: "google", sourceName: "Google", badgeLabel: "G" },
  { sourceId: "yelp", sourceName: "Yelp", badgeLabel: "Y" },
];

export interface SpecialistReputationProfileConfig {
  sources: ReputationSourceSummary[];
  /** Reviews from external platforms (merged with live SMOAC reviews in lib) */
  externalReviews: AggregatedReview[];
}

const ANTHONY_BROOKS_SOURCES: ReputationSourceSummary[] = [
  {
    sourceId: "smoac",
    sourceName: "SMOAC",
    totalReviews: 24,
    averageRating: 5.0,
    connectedStatus: "connected",
  },
  {
    sourceId: "google",
    sourceName: "Google",
    totalReviews: 93,
    averageRating: 4.9,
    connectedStatus: "connected",
    profileUrl: "https://www.google.com/maps",
  },
  {
    sourceId: "yelp",
    sourceName: "Yelp",
    totalReviews: 20,
    averageRating: 4.8,
    connectedStatus: "connected",
    profileUrl: "https://www.yelp.com",
  },
  {
    sourceId: "facebook",
    sourceName: "Facebook",
    totalReviews: 0,
    averageRating: null,
    connectedStatus: "disconnected",
    connectCtaLabel: "Connect Facebook Reviews",
  },
];

const ANTHONY_BROOKS_EXTERNAL_REVIEWS: AggregatedReview[] = [
  {
    id: "google-devon-c",
    profileId: "anthony-brooks",
    source: "google",
    reviewerName: "Devon C.",
    rating: 5,
    reviewText: "Explosive gains in speed and confidence on the field.",
    reviewDate: "2025-03-14T10:00:00.000Z",
    relativeTime: "5 weeks ago",
    sourceReviewUrl: "https://www.google.com/maps",
    isVerified: true,
  },
  {
    id: "google-michelle-k",
    profileId: "anthony-brooks",
    source: "google",
    reviewerName: "Michelle K.",
    rating: 5,
    reviewText: "Anthony's programming is sharp — my 40-yard dash dropped in six weeks.",
    reviewDate: "2025-04-02T14:30:00.000Z",
    relativeTime: "2 weeks ago",
    isVerified: true,
  },
  {
    id: "yelp-jordan-m",
    profileId: "anthony-brooks",
    source: "yelp",
    reviewerName: "Jordan M.",
    rating: 5,
    reviewText: "Professional, motivating, and always on time. Highly recommend for athletes.",
    reviewDate: "2025-03-28T09:15:00.000Z",
    relativeTime: "3 weeks ago",
    isVerified: false,
  },
  {
    id: "google-chris-l",
    profileId: "anthony-brooks",
    source: "google",
    reviewerName: "Chris L.",
    rating: 5,
    reviewText: "Best sports performance coach in North Park — period.",
    reviewDate: "2025-02-19T16:00:00.000Z",
    relativeTime: "2 months ago",
    isVerified: true,
  },
  {
    id: "yelp-priya-s",
    profileId: "anthony-brooks",
    source: "yelp",
    reviewerName: "Priya S.",
    rating: 4,
    reviewText: "Great facility recommendations and clear progress tracking every session.",
    reviewDate: "2025-01-22T11:45:00.000Z",
    relativeTime: "3 months ago",
  },
];

/** Per-profile reputation config — extend when specialists sync new sources */
export const SPECIALIST_REPUTATION_BY_PROFILE: Record<
  string,
  SpecialistReputationProfileConfig
> = {
  "anthony-brooks": {
    sources: ANTHONY_BROOKS_SOURCES,
    externalReviews: ANTHONY_BROOKS_EXTERNAL_REVIEWS,
  },
};
