"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInternalAuthSession } from "@/hooks/useInternalAuthSession";
import { INTERNAL_LOGIN_PATH } from "@/lib/internal-routes";

/** Guard company portal routes — redirects to internal login */
export function useRequireInternalAuth() {
  const router = useRouter();
  const { isReady, session } = useInternalAuthSession();

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      router.replace(INTERNAL_LOGIN_PATH);
    }
  }, [isReady, session, router]);

  const allowed = isReady && session != null;

  return { isReady: allowed, session: allowed ? session : null };
}
