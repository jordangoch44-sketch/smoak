import type { AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";

/** True when a marketplace session exists */
export function isLoggedIn(session: AuthSession | null | undefined): boolean {
  return Boolean(session);
}

/** Returns client | specialist when signed in, otherwise null */
export function getUserRole(
  session: AuthSession | null | undefined
): PublicAuthRole | null {
  if (!session || session.role === "admin") return null;
  return session.role;
}

/** Client accounts may save specialists to the shortlist */
export function canSaveSpecialists(
  session: AuthSession | null | undefined
): boolean {
  return getUserRole(session) === "client";
}
