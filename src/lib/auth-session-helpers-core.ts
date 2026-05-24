import type { AuthRole, AuthSession } from "@/types/auth";

/** True when a DEV session exists in localStorage */
export function isLoggedIn(session: AuthSession | null | undefined): boolean {
  return Boolean(session);
}

/** Returns client | specialist when signed in, otherwise null */
export function getUserRole(
  session: AuthSession | null | undefined
): AuthRole | null {
  return session?.role ?? null;
}

/** Client accounts may save specialists to the shortlist */
export function canSaveSpecialists(
  session: AuthSession | null | undefined
): boolean {
  return getUserRole(session) === "client";
}
