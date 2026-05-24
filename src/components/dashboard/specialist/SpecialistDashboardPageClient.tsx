"use client";

import {
  DashboardButton,
  DashboardGrid,
  DashboardLoadingState,
  DashboardPageShell,
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
    firstName,
    handleSignOut,
  } = useSpecialistDashboard();

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  return (
    <DashboardPageShell
      eyebrow="Specialist dashboard"
      title={`Good to see you, ${firstName}`}
      subtitle="Manage your profile, leads, and marketplace visibility."
      roleLabel="Specialist"
      actions={
        <DashboardButton variant="ghost" onClick={handleSignOut}>
          Sign out
        </DashboardButton>
      }
    >
      <DashboardGrid>
        <AnalyticsCard analytics={analytics} />
        <ProfileCompletionCard
          profileCompletion={profileCompletion}
          trainer={trainer}
        />
        <LeadsCard leads={data.newLeads} />
        <VisibilityRankingCard ranking={data.ranking ?? null} trainer={trainer} />
        <ReviewsCard trainer={trainer} />
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
