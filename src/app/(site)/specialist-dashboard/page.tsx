import type { Metadata } from "next";
import { Suspense } from "react";
import { SpecialistDashboardPageClient } from "@/components/dashboard";
import { DashboardLoadingState } from "@/components/dashboard/shared";

export const metadata: Metadata = {
  title: "Specialist Dashboard",
  description: "Manage your SMOAC specialist profile, leads, and visibility.",
};

export default function SpecialistDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <SpecialistDashboardPageClient />
    </Suspense>
  );
}
