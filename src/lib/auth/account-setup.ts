import type { ProfileRow } from "@/types/database";

export const COMPLETE_ACCOUNT_PATH = "/complete-account";

export type PasswordSetupStatus = "pending" | "complete" | "skipped";

export function normalizePasswordSetupStatus(
  value: string | null | undefined
): PasswordSetupStatus {
  if (value === "pending" || value === "skipped") return value;
  return "complete";
}

export function needsPasswordSetup(
  status: PasswordSetupStatus | string | null | undefined
): boolean {
  return normalizePasswordSetupStatus(status) === "pending";
}

/** Quick-signup resume flags preserved through /complete-account. */
export function buildCompleteAccountNextPath(
  resumeQuery?: "inquiry" | "save" | "account"
): string {
  if (resumeQuery === "inquiry") return `${COMPLETE_ACCOUNT_PATH}?inquiry=1`;
  if (resumeQuery === "save") return `${COMPLETE_ACCOUNT_PATH}?save=1`;
  return COMPLETE_ACCOUNT_PATH;
}

/** True when auth callback should land on first-time account setup. */
export function isCompleteAccountNextPath(nextPath: string): boolean {
  const path = nextPath.split("?")[0] ?? nextPath;
  return path === COMPLETE_ACCOUNT_PATH;
}

/**
 * After magic-link login from /login (dashboard/saved/home next paths),
 * passwordless users who skipped setup should not be forced again.
 */
export function isMagicLinkLoginDestination(nextPath: string): boolean {
  const path = nextPath.split("?")[0] ?? nextPath;
  return (
    path === "/" ||
    path === "/saved" ||
    path === "/client-dashboard" ||
    path === "/specialist-dashboard" ||
    path.startsWith("/explore")
  );
}

export function resolvePostAuthCallbackPath(
  nextPath: string,
  profile: Pick<ProfileRow, "password_setup_status"> | null,
  metadataStatus?: string | null
): string {
  const normalizedNext = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;

  if (isCompleteAccountNextPath(normalizedNext)) {
    return normalizedNext;
  }

  const status = normalizePasswordSetupStatus(
    profile?.password_setup_status ?? metadataStatus
  );

  if (status !== "pending") {
    return normalizedNext;
  }

  if (isMagicLinkLoginDestination(normalizedNext)) {
    return normalizedNext;
  }

  if (normalizedNext.includes("inquiry=1")) {
    return `${COMPLETE_ACCOUNT_PATH}?inquiry=1`;
  }
  if (normalizedNext.includes("save=1")) {
    return `${COMPLETE_ACCOUNT_PATH}?save=1`;
  }

  return COMPLETE_ACCOUNT_PATH;
}

export function shouldSkipPasswordSetupOnLogin(
  profile: Pick<ProfileRow, "password_setup_status"> | null,
  nextPath: string,
  metadataStatus?: string | null
): boolean {
  return (
    needsPasswordSetup(profile?.password_setup_status ?? metadataStatus) &&
    isMagicLinkLoginDestination(nextPath) &&
    !isCompleteAccountNextPath(nextPath)
  );
}
