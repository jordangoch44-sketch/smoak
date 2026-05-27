import type { AuthSession } from "@/types/auth";

/** True when session is a DEV admin account (owner or staff) */
export function isAdminSession(
  session: AuthSession | null | undefined
): boolean {
  return session?.role === "admin";
}
