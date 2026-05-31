"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { getUserRole } from "@/lib/specialist-saves";
import type { PublicAuthRole } from "@/lib/dev-auth";

/** Redirect unauthenticated or wrong-role users away from a role-specific dashboard */
export function useRequireAuth(requiredRole: PublicAuthRole): {
  isReady: boolean;
  session: ReturnType<typeof useAuthSession>["session"];
} {
  const router = useRouter();
  const { isReady, session } = useAuthSession();

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      router.replace(LOGIN_PATH);
      return;
    }
    if (session.role !== requiredRole) {
      const role = getUserRole(session);
      router.replace(role ? getDashboardPathForRole(role) : LOGIN_PATH);
    }
  }, [isReady, session, requiredRole, router]);

  const allowed =
    isReady && session != null && session.role === requiredRole;

  return { isReady: allowed, session: allowed ? session : null };
}
