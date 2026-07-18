import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthAppUrl } from "@/lib/auth/site-origin";
import {
  isCompleteAccountNextPath,
  resolvePostAuthCallbackPath,
  shouldSkipPasswordSetupOnLogin,
} from "@/lib/auth/account-setup";
import { ensureClientProfileForAuthUser } from "@/lib/auth/ensure-client-profile";
import { updatePasswordSetupStatus } from "@/lib/auth/password-setup-status";

const PROFILE_ENSURE_BUDGET_MS = 2_000;

function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.then((value) => value).catch(() => null),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/**
 * Magic-link / email-confirm callback.
 * Exchanges code for session cookies, then redirects via NEXT_PUBLIC_SITE_URL.
 * Profile ensure is best-effort and must never block the redirect to
 * /complete-account — password setup only needs an authenticated user.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          /* Non-blocking: password form must not wait on profiles/user_roles. */
          await withBudget(
            ensureClientProfileForAuthUser(supabase, user),
            PROFILE_ENSURE_BUDGET_MS
          );

          const { data: profile } = await supabase
            .from("profiles")
            .select("password_setup_status")
            .eq("user_id", user.id)
            .maybeSingle();

          const metadataStatus =
            typeof user.user_metadata?.password_setup_status === "string"
              ? user.user_metadata.password_setup_status
              : null;

          if (shouldSkipPasswordSetupOnLogin(profile, next, metadataStatus)) {
            await updatePasswordSetupStatus(supabase, user.id, "skipped");
          }

          let destination = resolvePostAuthCallbackPath(
            next,
            profile,
            metadataStatus
          );

          /* Quick-signup links always land on account setup when still pending. */
          if (
            !isCompleteAccountNextPath(destination) &&
            (metadataStatus === "pending" ||
              profile?.password_setup_status === "pending") &&
            !shouldSkipPasswordSetupOnLogin(profile, next, metadataStatus)
          ) {
            destination = next.includes("save=1")
              ? "/complete-account?save=1"
              : next.includes("inquiry=1")
                ? "/complete-account?inquiry=1"
                : "/complete-account";
          }

          return NextResponse.redirect(getAuthAppUrl(destination));
        }

        return NextResponse.redirect(getAuthAppUrl(next));
      }
    }
  }

  return NextResponse.redirect(getAuthAppUrl("/login?error=auth_callback"));
}
