import type { AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";

/**
 * True when a marketplace (client/specialist) session exists.
 * Admin accounts live on the internal portal — the public site treats
 * them as browsing signed out (no avatar chrome, login stays reachable).
 */
export function isLoggedIn(session: AuthSession | null | undefined): boolean {
  return Boolean(session && session.role !== "admin");
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
