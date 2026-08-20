import type { Metadata } from "next";
import { Founding50InvitePage } from "@/components/founding/Founding50InvitePage";
import {
  FOUNDING_50_LABEL,
  FOUNDING_INVITE_CODE_PARAM,
} from "@/lib/founding-50-invite";
import { getFounding50InviteStatus } from "@/lib/founding-50-invite-server";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

export const metadata: Metadata = {
  title: FOUNDING_50_LABEL,
  description: `Private invitation for SMOAC ${FOUNDING_50_LABEL} wellness specialists.`,
  ...NOINDEX_FOLLOW_NONE,
};

function readInviteCode(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || null;
}

export default async function Founding50Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const inviteCode = readInviteCode(params[FOUNDING_INVITE_CODE_PARAM]);
  const initialStatus = await getFounding50InviteStatus(inviteCode);

  return (
    <Founding50InvitePage
      initialStatus={initialStatus}
      inviteCode={inviteCode}
    />
  );
}
