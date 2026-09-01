/**
 * Shared type barrel — `@/types` is the canonical import for cross-feature types.
 */
export type {
  Gender,
  Specialty,
  Review,
  TrainerReviewSources,
  Certification,
  SocialLinks,
  TrainerMediaItem,
  ClientTransformationPhoto,
  Trainer,
} from "./trainer";

export type { TrainerFilters } from "./filters";

export type {
  FunnelWindow,
  FunnelStageId,
  FunnelStageMetric,
  SpecialistConversionMetric,
  FunnelKeyInsight,
  MarketplaceConversionFunnel,
} from "./admin-conversion-funnel";

