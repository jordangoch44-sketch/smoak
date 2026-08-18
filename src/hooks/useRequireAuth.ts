"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { getUserRole } from "@/lib/specialist-saves";
import type { PublicAuthRole } from "@/types/auth-roles";

/** Redirect unauthenticated or wrong-role users away from a role-specific dashboard */
export function useRequireAuth(requiredRole: PublicAuthRole): {
  isReady: boolean;
  session: ReturnType<typeof useAuthSession>["session"];
} {
  const router = useRouter();
  const { isReady, session, refreshSession } = useAuthSession();

  useEffect(() => {
    if (!isReady) return;

    if (session) {
      if (session.role !== requiredRole) {
        const role = getUserRole(session);
        router.replace(role ? getDashboardPathForRole(role) : LOGIN_PATH);
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      const supabase = getMarketplaceAuthClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          /* Auth cookies exist — rebuild the app session. Do not go to /login
           * or the proxy will bounce us back here in a loading loop. */
          await refreshSession();
          return;
        }
      }
      if (cancelled) return;
      router.replace(LOGIN_PATH);
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, session, requiredRole, router, refreshSession]);

  const allowed =
    isReady && session != null && session.role === requiredRole;

  return { isReady: allowed, session: allowed ? session : null };
}
