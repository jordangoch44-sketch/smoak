"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { buildDevAdminLoginHref } from "@/lib/admin-routes";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import type { AuthRole } from "@/types/auth";

function loginPathForRole(requiredRole: AuthRole): string {
  if (requiredRole === "admin") return buildDevAdminLoginHref();
  return LOGIN_PATH;
}

/** Redirect unauthenticated or wrong-role users away from a role-specific dashboard */
export function useRequireAuth(requiredRole: AuthRole): {
  isReady: boolean;
  session: ReturnType<typeof useAuthSession>["session"];
} {
  const router = useRouter();
  const { isReady, session } = useAuthSession();

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      router.replace(loginPathForRole(requiredRole));
      return;
    }
    if (session.role !== requiredRole) {
      router.replace(getDashboardPathForRole(session.role));
    }
  }, [isReady, session, requiredRole, router]);

  const allowed =
    isReady && session != null && session.role === requiredRole;

  return { isReady: allowed, session: allowed ? session : null };
}
