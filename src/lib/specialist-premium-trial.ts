/**
 * SMOAC Pro complimentary trial — 30 days free when a specialist goes live
 * (admin activate / approve). Founding 100 get 60 days. After that, free tier
 * unless they subscribe via Stripe ($19.99/mo, no second free month). Idempotent;
 * safe to call on every activate. Manual Plan-tab claim remains for older
 * accounts that never got one.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { readActiveAdminOverride } from "@/lib/admin-plan-override";
import {
  listingMembershipFromRow,
  resolveSpecialistProfileId,
  setSpecialistProfileMembership,
} from "@/lib/profiles/specialist-profiles-db";
import {
  parseMembershipPlan,
  type SpecialistMembershipPlan,
} from "@/lib/specialist-premium";
import { FOUNDING_PREMIUM_TRIAL_DAYS } from "@/lib/founding-50-invite";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const PREMIUM_TRIAL_DAYS = 30;

export type PremiumTrialGrantResult = {
  granted: boolean;
  extended: boolean;
  trialEndsAt: string | null;
  trialDays: number;
  founding: boolean;
};

function emptyGrantResult(
  partial?: Partial<PremiumTrialGrantResult>
): PremiumTrialGrantResult {
  return {
    granted: false,
    extended: false,
    trialEndsAt: null,
    trialDays: PREMIUM_TRIAL_DAYS,
    founding: false,
    ...partial,
  };
}

export function premiumTrialDaysForFounding(founding: boolean): number {
  return founding ? FOUNDING_PREMIUM_TRIAL_DAYS : PREMIUM_TRIAL_DAYS;
}

function applicationDataIsFounding(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const rec = data as {
    foundingInvite?: unknown;
    foundingInviteCode?: unknown;
  };
  return (
    rec.foundingInvite === true ||
    Boolean(String(rec.foundingInviteCode ?? "").trim())
  );
}

async function specialistIsFoundingInvite(
  supabase: SupabaseClient,
  userId: string,
  specialistId?: string | null
): Promise<boolean> {
  const trimmedUser = userId.trim();
  const trimmedId = specialistId?.trim() || "";
  if (!trimmedUser && !trimmedId) return false;

  let query = supabase
    .from("specialist_applications")
    .select("application_data")
    .limit(8);

  if (trimmedUser && trimmedId) {
    query = query.or(`user_id.eq.${trimmedUser},id.eq.${trimmedId}`);
  } else if (trimmedId) {
    query = query.eq("id", trimmedId);
  } else {
    query = query.eq("user_id", trimmedUser);
  }

  const { data, error } = await query;
  if (error || !data?.length) return false;
  return data.some((row) => applicationDataIsFounding(row.application_data));
}

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

export type ComplimentaryProTrialSignals = {
  trialEndsAt: string | null;
  isPaid: boolean;
  adminOverrideActive: boolean;
};

export function isComplimentaryProTrialWindowOpen(
  trialEndsAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!trialEndsAt) return false;
  const ms = Date.parse(trialEndsAt);
  return Number.isFinite(ms) && ms > now;
}

/** Complimentary 30/60-day Pro trial — not Stripe, not an admin grant. */
export function isComplimentaryProTrialActive(
  signals: ComplimentaryProTrialSignals | null | undefined,
  now = Date.now()
): boolean {
  if (!signals || signals.isPaid || signals.adminOverrideActive) return false;
  return isComplimentaryProTrialWindowOpen(signals.trialEndsAt, now);
}

export function complimentaryProTrialDaysRemaining(
  signals: ComplimentaryProTrialSignals | null | undefined,
  now = Date.now()
): number | null {
  if (!isComplimentaryProTrialActive(signals, now) || !signals?.trialEndsAt) {
    return null;
  }
  return daysUntil(signals.trialEndsAt, now);
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
 * Start the one-time Pro trial if this specialist has never had one.
 * Founding 100 get 60 days; everyone else gets 30. If a founding specialist
 * already started a shorter trial that is still active, extend to 60 days
 * from the original start. Idempotent — safe to call on every go-live activate.
 */
export async function grantSpecialistPremiumTrialIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  specialistProfileId?: string | null
): Promise<PremiumTrialGrantResult> {
  const founding = await specialistIsFoundingInvite(
    supabase,
    userId,
    specialistProfileId
  );
  const trialDays = premiumTrialDaysForFounding(founding);

  const { data: role, error } = await supabase
    .from("user_roles")
    .select(
      "role, premium_trial_started_at, premium_trial_ends_at, is_premium"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !role || role.role !== "specialist") {
    return emptyGrantResult({ founding, trialDays });
  }

  if (role.premium_trial_started_at) {
    const currentEndsAt = (role.premium_trial_ends_at as string | null) ?? null;
    const currentEndsMs = currentEndsAt ? Date.parse(currentEndsAt) : 0;
    const desiredEndsAt = addDays(role.premium_trial_started_at, trialDays);
    const desiredEndsMs = Date.parse(desiredEndsAt);
    const stillActive =
      Number.isFinite(currentEndsMs) && currentEndsMs > Date.now();

    if (
      stillActive &&
      Number.isFinite(desiredEndsMs) &&
      desiredEndsMs > currentEndsMs + 60_000
    ) {
      const nowIso = new Date().toISOString();
      const { error: extendError } = await supabase
        .from("user_roles")
        .update({
          is_premium: true,
          premium_trial_ends_at: desiredEndsAt,
          updated_at: nowIso,
        })
        .eq("user_id", userId);

      if (extendError) {
        console.warn("[SMOAC trial] extend failed:", extendError.message);
        return emptyGrantResult({
          founding,
          trialDays,
          trialEndsAt: currentEndsAt,
        });
      }

      await syncListingMembership(supabase, "premium", {
        profileId: specialistProfileId,
        userId,
      });

      return {
        granted: false,
        extended: true,
        trialEndsAt: desiredEndsAt,
        trialDays,
        founding,
      };
    }

    return emptyGrantResult({
      founding,
      trialDays,
      trialEndsAt: currentEndsAt,
    });
  }

  const startedAt = new Date().toISOString();
  const endsAt = addDays(startedAt, trialDays);

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
    return emptyGrantResult({ founding, trialDays });
  }

  await syncListingMembership(supabase, "premium", {
    profileId: specialistProfileId,
    userId,
  });

  return {
    granted: true,
    extended: false,
    trialEndsAt: endsAt,
    trialDays,
    founding,
  };
}

async function syncListingMembership(
  supabase: SupabaseClient,
  plan: SpecialistMembershipPlan,
  input: { profileId?: string | null; userId?: string | null }
): Promise<void> {
  const profileId = await resolveSpecialistProfileId(supabase, input);
  if (!profileId) return;
  const result = await setSpecialistProfileMembership(supabase, profileId, plan);
  if (!result.ok) {
    console.warn("[SMOAC membership] listing sync failed:", result.message);
  }
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
  const override = await readActiveAdminOverride(supabase, userId);

  if (override && override.plan !== "free") {
    if (!role.is_premium) {
      await supabase
        .from("user_roles")
        .update({ is_premium: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
    await syncListingMembership(supabase, override.plan, { userId });
    return {
      isPremium: true,
      isPaid,
      isTrialing: trialActive && !isPaid,
      trialEndsAt,
      trialStartedAt,
      trialJustEnded: false,
      daysRemaining: trialActive ? daysUntil(trialEndsAt as string, now) : null,
    };
  }

  if (isPaid) {
    const { data: billing } = await supabase
      .from("specialist_billing")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    const paidPlan =
      billing?.plan === "platinum" || billing?.plan === "premium"
        ? billing.plan
        : "premium";
    if (!role.is_premium) {
      await supabase
        .from("user_roles")
        .update({ is_premium: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
    await syncListingMembership(supabase, paidPlan, { userId });
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
    }
    await syncListingMembership(supabase, "premium", { userId });
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

  /* Listing membership is a mirror of access — not an entitlement. An expired
   * complimentary trial wrote Pro onto the listing; that leftover must not
   * keep the specialist on Pro. Preserve listing Pro only when there was
   * never a complimentary trial window (admin / legacy grant). */
  const hadExpiredComplimentaryTrial = Boolean(trialEndsAt) && !trialActive;
  if (!hadExpiredComplimentaryTrial) {
    const { data: profile } = await supabase
      .from("specialist_profiles")
      .select("is_premium, profile_data")
      .eq("user_id", userId)
      .maybeSingle();
    const durablePlan = listingMembershipFromRow(profile ?? {}).plan;
    if (durablePlan !== "free") {
      if (!role.is_premium) {
        await supabase
          .from("user_roles")
          .update({ is_premium: true, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
      await syncListingMembership(supabase, durablePlan, { userId });
      return {
        isPremium: true,
        isPaid,
        isTrialing: false,
        trialEndsAt,
        trialStartedAt,
        trialJustEnded: false,
        daysRemaining: trialActive ? daysUntil(trialEndsAt as string, now) : null,
      };
    }
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
    await syncListingMembership(supabase, "free", { userId });
  } else if (role.is_premium) {
    await supabase
      .from("user_roles")
      .update({ is_premium: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await syncListingMembership(supabase, "free", { userId });
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

const DAY_MS = 24 * 60 * 60 * 1000;

function daysElapsedSince(startedAt: string, nowMs: number): number {
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((nowMs - started) / DAY_MS));
}

/**
 * Daily cron helper: day-10, day-20, and last-day trial reminder emails.
 * Idempotent via premium_trial_*_emailed_at columns.
 */
export async function sendDuePremiumTrialReminderEmails(): Promise<{
  day10: number;
  day20: number;
  lastDay: number;
}> {
  const empty = { day10: 0, day20: 0, lastDay: 0 };
  const supabase = createSupabaseServiceClient();
  if (!supabase) return empty;

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const { data: rows, error } = await supabase
    .from("user_roles")
    .select(
      "user_id, premium_trial_started_at, premium_trial_ends_at, premium_trial_day10_emailed_at, premium_trial_day20_emailed_at, premium_trial_last_day_emailed_at"
    )
    .eq("role", "specialist")
    .eq("is_premium", true)
    .not("premium_trial_started_at", "is", null)
    .not("premium_trial_ends_at", "is", null)
    .gt("premium_trial_ends_at", nowIso);

  if (error || !rows?.length) {
    if (error) {
      console.warn("[SMOAC trial] reminder query failed:", error.message);
    }
    return empty;
  }

  const { sendPremiumTrialReminderEmail } = await import(
    "@/lib/email/premium-trial-email-service"
  );

  const counts = { day10: 0, day20: 0, lastDay: 0 };
  const db = supabase;

  for (const row of rows) {
    const userId = row.user_id as string;
    const startedAt = row.premium_trial_started_at as string | null;
    const endsAt = row.premium_trial_ends_at as string | null;
    if (!startedAt || !endsAt) continue;

    const paid = await hasActiveStripeSubscription(db, userId);
    if (paid) continue;

    const remaining = daysUntil(endsAt, nowMs);
    const elapsed = daysElapsedSince(startedAt, nowMs);

    const { data: profile } = await db
      .from("profiles")
      .select("email, first_name")
      .eq("user_id", userId)
      .maybeSingle();

    const email = profile?.email?.trim() ?? "";
    if (!email.includes("@")) continue;
    const firstName = profile?.first_name?.trim() || "there";

    async function stamp(column: string): Promise<boolean> {
      const { error: updateError } = await db
        .from("user_roles")
        .update({
          [column]: nowIso,
          updated_at: nowIso,
        })
        .eq("user_id", userId);
      if (updateError) {
        console.warn("[SMOAC trial] reminder stamp failed:", updateError.message);
        return false;
      }
      return true;
    }

    if (elapsed >= 10 && !row.premium_trial_day10_emailed_at) {
      const sent = await sendPremiumTrialReminderEmail({
        to: email,
        firstName,
        daysRemaining: remaining,
        kind: "day10",
      });
      if (sent.success && (await stamp("premium_trial_day10_emailed_at"))) {
        counts.day10 += 1;
      }
    }

    if (elapsed >= 20 && !row.premium_trial_day20_emailed_at) {
      const sent = await sendPremiumTrialReminderEmail({
        to: email,
        firstName,
        daysRemaining: remaining,
        kind: "day20",
      });
      if (sent.success && (await stamp("premium_trial_day20_emailed_at"))) {
        counts.day20 += 1;
      }
    }

    if (remaining <= 1 && !row.premium_trial_last_day_emailed_at) {
      const sent = await sendPremiumTrialReminderEmail({
        to: email,
        firstName,
        daysRemaining: remaining,
        kind: "last_day",
      });
      if (sent.success && (await stamp("premium_trial_last_day_emailed_at"))) {
        counts.lastDay += 1;
      }
    }
  }

  return counts;
}

/** Reminders first, then expire due trials. */
export async function processPremiumTrialLifecycle(): Promise<{
  reminders: { day10: number; day20: number; lastDay: number };
  expired: number;
}> {
  const reminders = await sendDuePremiumTrialReminderEmails();
  const expired = await expireDuePremiumTrials();
  return { reminders, expired };
}
