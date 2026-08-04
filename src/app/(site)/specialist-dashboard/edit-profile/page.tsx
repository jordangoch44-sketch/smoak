import type { Metadata } from "next";
import { Suspense } from "react";
import { SpecialistEditProfilePageClient } from "@/components/dashboard/SpecialistEditProfilePageClient";
import { DashboardLoadingState } from "@/components/dashboard/shared";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Update your live SMOAC specialist profile.",
};

export default function SpecialistEditProfilePage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <SpecialistEditProfilePageClient />
    </Suspense>
  );
}
