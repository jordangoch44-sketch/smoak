import type { Metadata } from "next";
import { SharedWorkoutLinkPage } from "@/components/dashboard/client/workouts/SharedWorkoutLinkPage";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "A workout on SMOAC",
  ...NOINDEX_FOLLOW_NONE,
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedWorkoutPage({ params }: PageProps) {
  const { token } = await params;
  return <SharedWorkoutLinkPage token={decodeURIComponent(token)} />;
}
