import type { Metadata } from "next";
import { SpecialistEditProfilePageClient } from "@/components/dashboard/SpecialistEditProfilePageClient";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Update your live SMOAC specialist profile.",
};

export default function SpecialistEditProfilePage() {
  return <SpecialistEditProfilePageClient />;
}
