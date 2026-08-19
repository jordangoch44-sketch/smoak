import type { Metadata } from "next";
import { CreateAccountWizardClient } from "@/components/auth/CreateAccountWizardClient";
import { isAuthReturnToSavedFromParams } from "@/lib/auth-return";
import { JOIN_INTRO_PARAM, JOIN_ROLE_PARAM, parseJoinAccountRole } from "@/lib/join-flow";
import { NOINDEX_FOLLOW_NONE } from "@/lib/seo/noindex";

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

export default async function CreateAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialJoinIntro = hasIntroFlag(params[JOIN_INTRO_PARAM]);
  const initialReturnToSaved = isAuthReturnToSavedFromParams(params);
  const initialAccountType = parseJoinAccountRole(params[JOIN_ROLE_PARAM]);

  return (
    <CreateAccountWizardClient
      initialJoinIntro={initialJoinIntro}
      initialReturnToSaved={initialReturnToSaved}
      initialAccountType={initialAccountType}
    />
  );
}
