import type { Metadata } from "next";
import { CoachInviteJoinPage } from "@/components/coaching/CoachInviteJoinPage";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Join your coach on SMOAC",
  ...NOINDEX_FOLLOW_NONE,
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinCoachPage({ params }: PageProps) {
  const { token } = await params;
  return <CoachInviteJoinPage token={decodeURIComponent(token)} />;
}
