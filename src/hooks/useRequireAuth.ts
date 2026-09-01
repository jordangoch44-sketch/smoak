"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { getUserRole } from "@/lib/specialist-saves";
import type { PublicAuthRole } from "@/types/auth-roles";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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
      try {
        sessionStorage.removeItem("smoac:auth-session-reload");
      } catch {
        /* ignore */
      }
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
        for (let attempt = 0; attempt < 6; attempt += 1) {
          if (cancelled) return;

          const { data } = await supabase.auth.getSession();
          if (cancelled) return;

          if (!data.session) break;

          /* Auth cookies exist — rebuild the app session. Do not go to /login
           * or the proxy will bounce us back here in a loading loop. */
          await refreshSession();
          if (cancelled) return;
          if (getAuthSessionSnapshot()) return;

          await delay(250 * (attempt + 1));
        }

        if (cancelled) return;
        if (getAuthSessionSnapshot()) return;

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          /* Cookie session still present but app session never built — hard
           * reload once so hydrate can recover without a login bounce. */
          const reloadKey = "smoac:auth-session-reload";
          try {
            if (sessionStorage.getItem(reloadKey) === "1") {
              sessionStorage.removeItem(reloadKey);
            } else {
              sessionStorage.setItem(reloadKey, "1");
              window.location.reload();
              return;
            }
          } catch {
            window.location.reload();
            return;
          }
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
