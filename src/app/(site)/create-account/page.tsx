import type { Metadata } from "next";
import { CreateAccountWizardClient } from "@/components/auth/CreateAccountWizardClient";
import { isAuthReturnToSavedFromParams } from "@/lib/auth-return";
import {
  FOUNDING_INVITE_CODE_PARAM,
  JOIN_FOUNDING_PARAM,
  parseJoinFoundingFlag,
} from "@/lib/founding-50-invite";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";
import {
  JOIN_INTRO_PARAM,
  JOIN_ROLE_PARAM,
  parseJoinAccountRole,
} from "@/lib/join-flow";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join SMOAC — find specialists as a client or get discovered as a health & wellness professional.",
  ...NOINDEX_FOLLOW_NONE,
};

function hasIntroFlag(
  value: string | string[] | undefined
): boolean {
  if (value === "1") return true;
  if (Array.isArray(value)) return value[0] === "1";
  return false;
}

function readInviteCode(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || null;
}

export default async function CreateAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialJoinIntro = hasIntroFlag(params[JOIN_INTRO_PARAM]);
  const initialReturnToSaved = isAuthReturnToSavedFromParams(params);
  const initialAccountType = parseJoinAccountRole(params[JOIN_ROLE_PARAM]);
  const initialFoundingInvite = parseJoinFoundingFlag(params[JOIN_FOUNDING_PARAM]);
  const initialFoundingInviteCode = readInviteCode(params[FOUNDING_INVITE_CODE_PARAM]);

  return (
    <CreateAccountWizardClient
      initialJoinIntro={initialJoinIntro}
      initialReturnToSaved={initialReturnToSaved}
      initialAccountType={initialAccountType}
      initialFoundingInvite={initialFoundingInvite}
      initialFoundingInviteCode={initialFoundingInviteCode}
    />
  );
}
