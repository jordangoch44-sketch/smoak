/**
 * SMOAC Pro complimentary trial — 30 days free when a specialist is activated
 * (approved + live), then free tier unless they subscribe via Stripe
 * ($9.99/mo, no second free month). Idempotent; not granted at signup.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const PREMIUM_TRIAL_DAYS = 30;

export interface SpecialistPremiumAccess {
  isPremium: boolean;
  /** Active Stripe subscription (paid or Stripe trial) */
  isPaid: boolean;
  /** Within signup complimentary window */
  isTrialing: boolean;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  /** Trial just ended this check (for one-shot notify UI) */
  trialJustEnded: boolean;
  daysRemaining: number | null;
}

function addDays(iso: string | Date, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function daysUntil(endsAt: string, now = Date.now()): number {
  const ms = new Date(endsAt).getTime() - now;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

async function hasActiveStripeSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("specialist_billing")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  const status = data?.status;
  return status === "active" || status === "trialing";
}

/**
 * Start the one-time 30-day Pro trial if this specialist has never had one.
 * Idempotent — safe to call on every activate.
 */
export async function grantSpecialistPremiumTrialIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  specialistProfileId?: string | null
): Promise<{ granted: boolean; trialEndsAt: string | null }> {
  const { data: role, error } = await supabase
    .from("user_roles")
    .select(
      "role, premium_trial_started_at, premium_trial_ends_at, is_premium"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !role || role.role !== "specialist") {
    return { granted: false, trialEndsAt: null };
  }

  if (role.premium_trial_started_at) {
    return {
      granted: false,
      trialEndsAt: role.premium_trial_ends_at ?? null,
    };
  }

  const startedAt = new Date().toISOString();
  const endsAt = addDays(startedAt, PREMIUM_TRIAL_DAYS);

  const { error: updateError } = await supabase
    .from("user_roles")
    .update({
      is_premium: true,
      premium_trial_started_at: startedAt,
      premium_trial_ends_at: endsAt,
      updated_at: startedAt,
    })
    .eq("user_id", userId);

  if (updateError) {
    console.warn("[SMOAC trial] grant failed:", updateError.message);
    return { granted: false, trialEndsAt: null };
  }

  if (specialistProfileId) {
    await supabase
      .from("specialist_profiles")
      .update({ is_premium: true, updated_at: startedAt })
      .eq("id", specialistProfileId);
  } else {
    await supabase
      .from("specialist_profiles")
      .update({ is_premium: true, updated_at: startedAt })
      .eq("user_id", userId);
  }

  return { granted: true, trialEndsAt: endsAt };
}

/**
 * Resolve premium access and expire complimentary trial when due.
 * Prefer service client for writes from cron; user client works for own row.
 */
export async function resolveAndSyncSpecialistPremiumAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<SpecialistPremiumAccess> {
  const empty: SpecialistPremiumAccess = {
    isPremium: false,
    isPaid: false,
    isTrialing: false,
    trialEndsAt: null,
    trialStartedAt: null,
    trialJustEnded: false,
    daysRemaining: null,
  };

  const { data: role, error } = await supabase
    .from("user_roles")
    .select(
      "role, is_premium, premium_trial_started_at, premium_trial_ends_at, premium_trial_ended_notified_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !role || role.role !== "specialist") {
    return empty;
  }

  const isPaid = await hasActiveStripeSubscription(supabase, userId);
  const trialEndsAt = role.premium_trial_ends_at as string | null;
  const trialStartedAt = role.premium_trial_started_at as string | null;
  const now = Date.now();
  const trialActive =
    Boolean(trialEndsAt) && new Date(trialEndsAt as string).getTime() > now;

  if (isPaid) {
    if (!role.is_premium) {
      await supabase
        .from("user_roles")
        .update({ is_premium: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabase
        .from("specialist_profiles")
        .update({
          is_premium: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
    return {
      isPremium: true,
      isPaid: true,
      isTrialing: false,
      trialEndsAt,
      trialStartedAt,
      trialJustEnded: false,
      daysRemaining: trialActive ? daysUntil(trialEndsAt as string, now) : null,
    };
  }

  if (trialActive) {
    if (!role.is_premium) {
      await supabase
        .from("user_roles")
        .update({ is_premium: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabase
        .from("specialist_profiles")
        .update({
          is_premium: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
    return {
      isPremium: true,
      isPaid: false,
      isTrialing: true,
      trialEndsAt,
      trialStartedAt,
      trialJustEnded: false,
      daysRemaining: daysUntil(trialEndsAt as string, now),
    };
  }

  /* Trial ended (or never started) and not paid */
  let trialJustEnded = false;
  if (trialEndsAt && !role.premium_trial_ended_notified_at) {
    trialJustEnded = true;
    await supabase
      .from("user_roles")
      .update({
        is_premium: false,
        premium_trial_ended_notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    await supabase
      .from("specialist_profiles")
      .update({
        is_premium: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else if (role.is_premium) {
    await supabase
      .from("user_roles")
      .update({ is_premium: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await supabase
      .from("specialist_profiles")
      .update({
        is_premium: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  return {
    isPremium: false,
    isPaid: false,
    isTrialing: false,
    trialEndsAt,
    trialStartedAt,
    trialJustEnded,
    daysRemaining: null,
  };
}

/** Cron / batch: expire all due trials (service role). */
export async function expireDuePremiumTrials(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "specialist")
    .eq("is_premium", true)
    .not("premium_trial_ends_at", "is", null)
    .lte("premium_trial_ends_at", nowIso);

  if (error || !due?.length) return 0;

  let expired = 0;
  for (const row of due) {
    const paid = await hasActiveStripeSubscription(supabase, row.user_id);
    if (paid) continue;
    const result = await resolveAndSyncSpecialistPremiumAccess(
      supabase,
      row.user_id
    );
    if (!result.isPremium) expired += 1;
  }
  return expired;
}
