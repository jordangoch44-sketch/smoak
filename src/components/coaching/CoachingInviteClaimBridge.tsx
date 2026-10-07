"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { requestAcceptCoaching } from "@/lib/coaching/coaching-service";
import { readCoachingInviteToken } from "@/lib/coaching/invite-token";

/**
 * Claims a coaching share link stored on the account at signup.
 * Covers email confirmation that lands somewhere other than /join.
 */
export function CoachingInviteClaimBridge() {
  const { session, isReady } = useAuthSession();
  const pathname = usePathname();
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !session || session.role !== "client") return;
    if (pathname.startsWith("/join/")) return;
    if (attemptedFor.current === session.userId) return;
    attemptedFor.current = session.userId;

    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const token = readCoachingInviteToken(data.user?.user_metadata);
      if (!token) return;
      await requestAcceptCoaching({ token });
    })();
  }, [isReady, pathname, session]);

  return null;
}
