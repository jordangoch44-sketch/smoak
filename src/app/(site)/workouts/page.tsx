import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientWorkoutsPageClient } from "@/components/dashboard/ClientWorkoutsPageClient";
import { DashboardLoadingState } from "@/components/dashboard/shared";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Workouts",
  description: "Your workouts, calendar, and workout generator on SMOAC.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function WorkoutsPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <ClientWorkoutsPageClient />
    </Suspense>
  );
}
