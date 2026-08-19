import type { Metadata } from "next";
import { FoundingTrainersInvitePage } from "@/components/founding/FoundingTrainersInvitePage";
import { FOUNDING_INVITE_CODE_PARAM } from "@/lib/founding-trainer-invite";
import { getFoundingTrainerInviteStatus } from "@/lib/founding-trainer-invite-server";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: "Founding Specialists",
  description: "Private invitation for SMOAC founding wellness specialists.",
  ...NOINDEX_FOLLOW_NONE,
};

function readInviteCode(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || null;
}

export default async function FoundingTrainersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const inviteCode = readInviteCode(params[FOUNDING_INVITE_CODE_PARAM]);
  const initialStatus = await getFoundingTrainerInviteStatus(inviteCode);

  return (
    <FoundingTrainersInvitePage
      initialStatus={initialStatus}
      inviteCode={inviteCode}
    />
  );
}
