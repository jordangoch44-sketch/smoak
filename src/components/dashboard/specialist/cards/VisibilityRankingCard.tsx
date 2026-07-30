import type { SpecialistDashboardRanking } from "@/types/specialist-dashboard";
import {
  DashboardMetricCard,
  DashboardSection,
} from "@/components/dashboard/shared";

interface VisibilityRankingCardProps {
  ranking: SpecialistDashboardRanking | null;
  isPremium: boolean;
  /** SMOAC client review average (not Google/catalog ★) */
  smoacRating?: number | null;
  smoacReviewCount?: number;
}

export function VisibilityRankingCard({
  ranking,
  isPremium,
  smoacRating = null,
  smoacReviewCount = 0,
}: VisibilityRankingCardProps) {
  const hasSmoacReviews = smoacReviewCount > 0 && smoacRating != null && smoacRating > 0;

  return (
    <DashboardSection
      title="Ranking"
      description="How you appear in SMOAC city rankings"
      href="/rankings"
      linkLabel="View rankings"
    >
      <div className="dashboard-metrics-row">
        <DashboardMetricCard
          label="City rank"
          value={ranking ? `#${ranking.rank}` : "Unranked"}
          detail={
            ranking
              ? ranking.listingTitle
              : "Earn SMOAC client reviews to enter city rankings"
          }
          lockValues={!isPremium}
        />
        <DashboardMetricCard
          label="SMOAC ★"
          value={hasSmoacReviews ? smoacRating.toFixed(1) : "—"}
          detail={
            hasSmoacReviews
              ? `${smoacReviewCount} SMOAC review${smoacReviewCount === 1 ? "" : "s"}`
              : "No SMOAC reviews yet"
          }
          lockValues={!isPremium}
        />
      </div>
    </DashboardSection>
  );
}
