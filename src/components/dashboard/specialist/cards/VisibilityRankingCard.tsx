import type { Trainer } from "@/types";
import type { SpecialistDashboardRanking } from "@/types/specialist-dashboard";
import {
  DashboardMetricCard,
  DashboardSection,
} from "@/components/dashboard/shared";

interface VisibilityRankingCardProps {
  ranking: SpecialistDashboardRanking | null;
  trainer: Trainer | undefined;
}

export function VisibilityRankingCard({ ranking, trainer }: VisibilityRankingCardProps) {
  return (
    <DashboardSection
      title="Visibility / ranking"
      description="How you appear in SMOAC rankings"
      href="/rankings"
    >
      <div className="dashboard-metrics-row">
        <DashboardMetricCard
          label="City rank"
          value={ranking ? `#${ranking.rank}` : "Unranked"}
          detail={
            ranking ? ranking.listingTitle : "Complete profile to enter rankings"
          }
        />
        <DashboardMetricCard
          label="Rating"
          value={trainer ? trainer.rating.toFixed(1) : "—"}
          detail={trainer ? `${trainer.reviewCount} reviews` : undefined}
        />
      </div>
    </DashboardSection>
  );
}
