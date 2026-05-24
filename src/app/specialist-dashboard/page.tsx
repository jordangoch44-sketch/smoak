import type { Metadata } from "next";
import { SpecialistDashboardPageClient } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Specialist Dashboard",
  description: "Manage your SMOAC specialist profile, leads, and visibility.",
};

export default function SpecialistDashboardPage() {
  return <SpecialistDashboardPageClient />;
}
