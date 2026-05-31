import {
  findDevAccountByEmail,
  normalizeDevEmail,
  normalizeDevPassword,
} from "@/lib/dev-auth";
import type { InternalAuthSession } from "@/types/internal-auth";
import type { AdminRoleType } from "@/types/admin-permissions";

export const INTERNAL_INVALID_LOGIN_MESSAGE =
  "Sign-in failed. Check your email and password.";

/** DEV — company portal credentials; tier must match selected Owner vs Staff */
export function validateDevInternalLogin(
  adminRole: AdminRoleType,
  email: string,
  password: string
): InternalAuthSession | null {
  const normalizedEmail = normalizeDevEmail(email);
  const normalizedPassword = normalizeDevPassword(password);
  const account = findDevAccountByEmail(normalizedEmail);

  if (!account || account.role !== "admin") return null;
  if (normalizeDevPassword(account.password) !== normalizedPassword) {
    return null;
  }

  const accountRole: AdminRoleType = account.adminRole ?? "owner_admin";
  if (accountRole !== adminRole) return null;

  return {
    email: normalizedEmail,
    signedInAt: new Date().toISOString(),
    adminRole: accountRole,
    displayName: account.displayName,
  };
}
