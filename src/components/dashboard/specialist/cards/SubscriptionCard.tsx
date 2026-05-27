import type { SpecialistSubscription } from "@/types/specialist-dashboard";
import { SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";
import { DashboardButton, DashboardSection } from "@/components/dashboard/shared";

interface SubscriptionCardProps {
  subscription: SpecialistSubscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  return (
    <DashboardSection
      title="Subscription / account settings"
      description="Your SMOAC marketplace plan"
    >
      <div className="dashboard-account-card">
        <div className="dashboard-account-card__row">
          <span className="dashboard-account-card__label">Plan</span>
          <span className="dashboard-account-card__value">{subscription.plan}</span>
        </div>
        <div className="dashboard-account-card__row">
          <span className="dashboard-account-card__label">Status</span>
          <span className="dashboard-account-card__value">{subscription.status}</span>
        </div>
        {subscription.isPremium ? (
          <div className="dashboard-account-card__row">
            <span className="dashboard-account-card__label">Renews</span>
            <span className="dashboard-account-card__value">{subscription.renewsOn}</span>
          </div>
        ) : (
          <div className="dashboard-account-card__row">
            <span className="dashboard-account-card__label">Pro</span>
            <span className="dashboard-account-card__value">{SMOAC_PRO_PRICE_LABEL}</span>
          </div>
        )}
        <DashboardButton variant="link" href="/login">
          Manage account →
        </DashboardButton>
      </div>
    </DashboardSection>
  );
}
