import type { Metadata } from "next";
import { ProfileHubPageClient } from "@/components/account/ProfileHubPageClient";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Sign in or create a free SMOAC account to save specialists and manage your shortlist.",
  ...NOINDEX_FOLLOW_NONE,
};

export default function ProfilePage() {
  return <ProfileHubPageClient />;
}
