import type { Trainer } from "@/types";
import type { SpecialistDashboardRanking } from "@/types/specialist-dashboard";
import {
  DashboardMetricCard,
  DashboardSection,
} from "@/components/dashboard/shared";

interface VisibilityRankingCardProps {
  ranking: SpecialistDashboardRanking | null;
  trainer: Trainer | undefined;
  isPremium: boolean;
}

export function VisibilityRankingCard({
  ranking,
  trainer,
  isPremium,
}: VisibilityRankingCardProps) {
  return (
    <DashboardSection
      title="Ranking"
      description="How you appear in SMOAC city rankings"
      href={isPremium ? "/rankings" : undefined}
      linkLabel="View rankings"
    >
      <div className="dashboard-metrics-row">
        <DashboardMetricCard
          label="City rank"
          value={ranking ? `#${ranking.rank}` : "Unranked"}
          detail={
            ranking ? ranking.listingTitle : "Complete profile to enter rankings"
          }
          lockValues={!isPremium}
        />
        <DashboardMetricCard
          label="Rating"
          value={trainer ? trainer.rating.toFixed(1) : "—"}
          detail={trainer ? `${trainer.reviewCount} reviews` : undefined}
          lockValues={!isPremium}
        />
      </div>
    </DashboardSection>
  );
}
