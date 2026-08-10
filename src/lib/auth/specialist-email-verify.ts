import { getMarketplaceAuthClient, isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { logAuth } from "@/lib/auth/auth-logger";
import { getAuthCallbackUrl } from "@/lib/auth/site-origin";

/** After confirm-email, return to specialist onboarding (not dashboard). */
export function specialistOnboardingEmailRedirectTo(): string {
  return getAuthCallbackUrl("/create-account?role=specialist&verified=1");
}

/**
 * Resend Supabase confirm-signup mail for specialist account details (step 2).
 */
export async function resendSpecialistSignupEmail(
  email: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, message: "Enter your email address." };
  }

  if (!isMarketplaceSupabaseActive()) {
    return {
      ok: false,
      message: "Email confirmation isn’t available in this build.",
    };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  logAuth("specialist_email.resend", { email: trimmed });

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
    options: {
      emailRedirectTo: specialistOnboardingEmailRedirectTo(),
    },
  });

  if (error) {
    logAuth("specialist_email.resend_failed", { message: error.message });
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
