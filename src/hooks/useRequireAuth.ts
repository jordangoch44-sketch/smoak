"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import type { AuthRole } from "@/types/auth";

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
      router.replace(LOGIN_PATH);
      return;
    }
    if (session.role !== requiredRole) {
      router.replace(getDashboardPathForRole(session.role));
    }
  }, [isReady, session, requiredRole, router]);

  return { isReady, session };
}
