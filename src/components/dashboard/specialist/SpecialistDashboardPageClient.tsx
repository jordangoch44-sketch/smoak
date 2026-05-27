"use client";

import {
  DashboardEditProfileLink,
  DashboardGrid,
  DashboardLoadingState,
  DashboardPageShell,
  DashboardSignOutButton,
} from "@/components/dashboard/shared";
import {
  AnalyticsCard,
  LeadsCard,
  ProfileCompletionCard,
  ReviewsCard,
  SubscriptionCard,
  VisibilityRankingCard,
} from "@/components/dashboard/specialist/cards";
import { useSpecialistDashboard } from "@/components/dashboard/specialist/useSpecialistDashboard";

export function SpecialistDashboardPageClient() {
  const {
    isReady,
    session,
    data,
    trainer,
    profileCompletion,
    analytics,
    isPremium,
    firstName,
    handleSignOut,
  } = useSpecialistDashboard();

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  return (
    <DashboardPageShell
      variant="specialist"
      eyebrow="Specialist dashboard"
      title={`Good to see you, ${firstName}`}
      subtitle="Manage your profile, leads, and marketplace visibility."
      roleLabel="Specialist"
      utilityBar={<DashboardSignOutButton onClick={handleSignOut} />}
      introActions={<DashboardEditProfileLink />}
    >
      <DashboardGrid>
        <AnalyticsCard analytics={analytics} isPremium={isPremium} />
        <ProfileCompletionCard
          profileCompletion={profileCompletion}
          trainer={trainer}
        />
        <LeadsCard leads={data.newLeads} />
        <VisibilityRankingCard
          ranking={data.ranking ?? null}
          trainer={trainer}
          isPremium={isPremium}
        />
        <ReviewsCard trainer={trainer} isPremium={isPremium} />
        <SubscriptionCard subscription={data.subscription} />
        {/*
          Future dashboard slots (see SpecialistFutureSlots.ts):
          premium memberships, boosted profiles, messaging,
          booking management, analytics graphs, notifications
        */}
      </DashboardGrid>
    </DashboardPageShell>
  );
}
