import type { SpecialistDashboardRanking } from "@/types/specialist-dashboard";
import {
  DashboardCollapsibleSection,
  DashboardMetricCard,
  DashboardSectionIcon,
} from "@/components/dashboard/shared";

interface VisibilityRankingCardProps {
  ranking: SpecialistDashboardRanking | null;
  isPremium: boolean;
  /** SMOAC client review average (not Google/catalog ★) */
  smoacRating?: number | null;
  smoacReviewCount?: number;
  /** Profession / category label for secondary rank context */
  categoryLabel?: string;
  defaultOpen?: boolean;
}

export function VisibilityRankingCard({
  ranking,
  isPremium,
  smoacRating = null,
  smoacReviewCount = 0,
  categoryLabel,
  defaultOpen = false,
}: VisibilityRankingCardProps) {
  const hasSmoacReviews =
    smoacReviewCount > 0 && smoacRating != null && smoacRating > 0;
  const citySummary = ranking ? `#${ranking.rank}` : "Unranked";
  const smoacSummary = hasSmoacReviews
    ? `★ ${smoacRating.toFixed(1)}`
    : "No ★ yet";

  return (
    <DashboardCollapsibleSection
      title="Rankings"
      icon={<DashboardSectionIcon id="rankings" />}
      description="How you appear across SMOAC city and category boards"
      summary={`${citySummary} · ${smoacSummary}`}
      href="/rankings"
      linkLabel="View rankings"
      defaultOpen={defaultOpen}
      span="full"
    >
      <div className="dashboard-metrics-row dashboard-metrics-row--rankings">
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
          label="Category"
          value={categoryLabel?.trim() || "—"}
          detail={
            ranking
              ? `Board: ${ranking.listingTitle}`
              : "Your profession category on Rankings"
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
    </DashboardCollapsibleSection>
  );
}
