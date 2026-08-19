import type { Metadata } from "next";
import { Suspense } from "react";
import { SpecialistDashboardPageClient } from "@/components/dashboard";
import { DashboardLoadingState } from "@/components/dashboard/shared";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Specialist Dashboard",
  description: "Manage your SMOAC specialist profile, leads, and visibility.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function SpecialistDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <SpecialistDashboardPageClient />
    </Suspense>
  );
}
