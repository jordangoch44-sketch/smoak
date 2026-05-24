import type { Trainer } from "@/types";
import {
  DashboardListItem,
  DashboardSection,
} from "@/components/dashboard/shared";

interface ReviewsCardProps {
  trainer: Trainer | undefined;
}

export function ReviewsCard({ trainer }: ReviewsCardProps) {
  return (
    <DashboardSection title="Reviews" description="Latest client feedback">
      {trainer && trainer.reviews.length > 0 ? (
        <ul className="dashboard-list">
          {trainer.reviews.slice(0, 2).map((review) => (
            <li key={review.id}>
              <DashboardListItem
                title={review.author}
                subtitle={review.text}
                meta={`★ ${review.rating}`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-section__desc">No reviews yet.</p>
      )}
    </DashboardSection>
  );
}
