import type { Metadata } from "next";
import { Suspense } from "react";
import { SpecialistEditProfilePageClient } from "@/components/dashboard/SpecialistEditProfilePageClient";
import { DashboardLoadingState } from "@/components/dashboard/shared";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Update your live SMOAC specialist profile.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function SpecialistEditProfilePage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <SpecialistEditProfilePageClient />
    </Suspense>
  );
}
