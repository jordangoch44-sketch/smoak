import type { Metadata } from "next";
import { ProfileHubPageClient } from "@/components/account/ProfileHubPageClient";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Sign in or create a free SMOAC account to save specialists and manage your shortlist.",
};

export default function ProfilePage() {
  return <ProfileHubPageClient />;
}
