/**
 * Admin plan change: send a Stripe checkout link, or apply a complimentary override.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applySpecialistMembershipEntitlements,
  membershipPlanRank,
  readActiveAdminOverride,
} from "@/lib/admin-plan-override";
import { sendAdminPlanCheckoutEmail } from "@/lib/email/admin-plan-checkout-email-service";
import {
  parseMembershipPlan,
  type SpecialistMembershipPlan,
} from "@/lib/specialist-premium";
import {
  getSiteUrlForStripe,
  getStripe,
  getStripePriceId,
  isStripeConfigured,
} from "@/lib/stripe/config";
import {
  isMembershipProduct,
  membershipPlanLabel,
  resolveProductKeyFromStripe,
} from "@/lib/stripe/products";
import type {
  AdminPlanChangeDuration,
  AdminPlanChangeResult,
} from "@/types/admin-specialist-plan-change";

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing"]);

function addDaysIso(days: number, from = new Date()): string {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function durationEndsAt(
  duration: AdminPlanChangeDuration
): string | null {
  if (duration.kind === "indefinite") return null;
  const days = Math.floor(duration.days);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error("Enter at least 1 day, or choose indefinitely.");
  }
  return addDaysIso(days);
}

async function loadSpecialistTarget(
  supabase: SupabaseClient,
  specialistId: string
): Promise<{
  specialistId: string;
  userId: string | null;
  email: string | null;
  firstName: string;
  displayName: string;
} | null> {
  const { data: profile, error } = await supabase
    .from("specialist_profiles")
    .select("id, user_id, display_name")
    .eq("id", specialistId)
    .maybeSingle();

  if (error || !profile) return null;

  const userId = typeof profile.user_id === "string" ? profile.user_id : null;
  let email: string | null = null;
  let firstName = "";

  if (userId) {
    const { data: person } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("user_id", userId)
      .maybeSingle();
    email = person?.email?.trim().toLowerCase() || null;
    firstName = person?.first_name?.trim() || "";

    if (!email) {
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      email = authData.user?.email?.trim().toLowerCase() || null;
    }
  }

  if (!email) {
    const { data: application } = await supabase
      .from("specialist_applications")
      .select("email")
      .eq("id", specialistId)
      .maybeSingle();
    email = application?.email?.trim().toLowerCase() || null;
  }

  return {
    specialistId: profile.id,
    userId,
    email,
    firstName,
    displayName: String(profile.display_name ?? "").trim(),
  };
}

async function cancelStripeMembershipSubscriptions(input: {
  userId: string;
  keepIfRankGte?: SpecialistMembershipPlan;
}): Promise<void> {
  if (!isStripeConfigured()) return;
  const stripe = getStripe();
  if (!stripe) return;

  const { createSupabaseServiceClient } = await import(
    "@/lib/supabase/service"
  );
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { data: billing } = await supabase
    .from("specialist_billing")
    .select("stripe_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  const customerId = billing?.stripe_customer_id;
  if (!customerId) return;

  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 40,
    expand: ["data.items.data.price"],
  });

  const keepRank = input.keepIfRankGte
    ? membershipPlanRank(input.keepIfRankGte)
    : -1;

  for (const sub of list.data) {
    if (!ACTIVE_STRIPE_STATUSES.has(sub.status)) continue;
    for (const item of sub.items.data) {
      const price = item.price;
      const key = resolveProductKeyFromStripe({
        priceId: typeof price?.id === "string" ? price.id : null,
        metadata: {
          ...(typeof price?.metadata === "object" && price.metadata
            ? price.metadata
            : {}),
          ...(sub.metadata ?? {}),
        } as Record<string, string>,
      });
      if (!key || !isMembershipProduct(key)) continue;
      if (membershipPlanRank(key) <= keepRank) continue;
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch (err) {
        console.error("[admin plan] failed to cancel membership sub:", err);
      }
      break;
    }
  }
}

async function upsertAdminOverride(
  supabase: SupabaseClient,
  input: {
    userId: string;
    specialistProfileId: string;
    plan: SpecialistMembershipPlan;
    endsAt: string | null;
    grantedBy: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("specialist_billing")
    .select("status, plan, active_addons, stripe_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  const base = {
    user_id: input.userId,
    specialist_profile_id: input.specialistProfileId,
    stripe_customer_id: existing?.stripe_customer_id ?? null,
    status: existing?.status ?? "none",
    plan: existing?.plan ?? "free",
    active_addons: existing?.active_addons ?? [],
    updated_at: now,
  };

  const { error } = await supabase.from("specialist_billing").upsert(
    {
      ...base,
      admin_override_plan: input.plan,
      admin_override_ends_at: input.endsAt,
      admin_override_granted_at: now,
      admin_override_granted_by: input.grantedBy,
    },
    { onConflict: "user_id" }
  );

  if (!error) return;

  console.warn(
    "[admin plan] override columns unavailable, applying entitlements only:",
    error.message
  );
  await supabase.from("specialist_billing").upsert(base, { onConflict: "user_id" });
}

async function clearAdminOverride(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("specialist_billing")
    .update({
      admin_override_plan: null,
      admin_override_ends_at: null,
      admin_override_granted_at: null,
      admin_override_granted_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function applyAdminPlanOverride(input: {
  supabase: SupabaseClient;
  specialistId: string;
  plan: SpecialistMembershipPlan;
  duration: AdminPlanChangeDuration;
  grantedBy: string;
}): Promise<AdminPlanChangeResult> {
  const target = await loadSpecialistTarget(input.supabase, input.specialistId);
  if (!target) {
    return { ok: false, message: "Specialist account was not found." };
  }

  let endsAt: string | null;
  try {
    endsAt = durationEndsAt(input.duration);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Invalid duration.",
    };
  }

  if (target.userId && membershipPlanRank(input.plan) < 2) {
    await cancelStripeMembershipSubscriptions({
      userId: target.userId,
      keepIfRankGte: input.plan === "free" ? undefined : input.plan,
    });
  }

  if (target.userId) {
    if (input.plan === "free") {
      await clearAdminOverride(input.supabase, target.userId);
      /* End any complimentary trial so Free actually sticks. */
      const now = new Date().toISOString();
      await input.supabase
        .from("user_roles")
        .update({
          premium_trial_ends_at: now,
          updated_at: now,
        })
        .eq("user_id", target.userId)
        .gt("premium_trial_ends_at", now);
    } else {
      await upsertAdminOverride(input.supabase, {
        userId: target.userId,
        specialistProfileId: target.specialistId,
        plan: input.plan,
        endsAt,
        grantedBy: input.grantedBy,
      });
    }
  }

  const entitlements = await applySpecialistMembershipEntitlements(input.supabase, {
    userId: target.userId,
    specialistProfileId: target.specialistId,
    plan: input.plan,
  });
  if (!entitlements.ok) {
    return entitlements;
  }

  const planLabel = membershipPlanLabel(input.plan);
  const durationCopy =
    input.plan === "free"
      ? ""
      : endsAt
        ? ` through ${new Date(endsAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`
        : " indefinitely";

  return {
    ok: true,
    method: "admin_override",
    plan: input.plan,
    planLabel,
    overrideEndsAt: input.plan === "free" ? null : endsAt,
    message: `Applied ${planLabel}${durationCopy} for ${
      target.displayName || "this specialist"
    }.`,
  };
}

export async function createAdminPlanCheckoutLink(input: {
  supabase: SupabaseClient;
  specialistId: string;
  plan: "premium" | "platinum";
}): Promise<AdminPlanChangeResult> {
  const target = await loadSpecialistTarget(input.supabase, input.specialistId);
  if (!target) {
    return { ok: false, message: "Specialist account was not found." };
  }
  if (!target.userId) {
    return {
      ok: false,
      message: "This specialist has no login yet, so a checkout link cannot be sent.",
    };
  }
  if (!target.email) {
    return {
      ok: false,
      message: "This specialist has no email on file for a checkout link.",
    };
  }
  if (!isStripeConfigured()) {
    return { ok: false, message: "Stripe is not configured yet." };
  }

  const stripe = getStripe();
  const priceId = getStripePriceId(input.plan);
  if (!stripe || !priceId) {
    return {
      ok: false,
      message: `${membershipPlanLabel(input.plan)} is not configured in Stripe yet.`,
    };
  }

  const { ensureSpecialistStripeCustomer } = await import(
    "@/lib/stripe/ensure-customer"
  );
  const { data: authData, error: authError } =
    await input.supabase.auth.admin.getUserById(target.userId);
  if (authError || !authData.user) {
    return { ok: false, message: "Could not load this specialist’s login." };
  }

  const customer = await ensureSpecialistStripeCustomer({
    user: authData.user,
  });
  if (!customer.ok) {
    return { ok: false, message: customer.error };
  }

  const siteUrl = getSiteUrlForStripe();
  const planLabel = membershipPlanLabel(input.plan);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        supabase_user_id: target.userId,
        specialist_profile_id: target.specialistId,
        smoac_product: input.plan,
        smoac_kind: "plan",
        smoac_plan: input.plan,
        plan: input.plan,
        created_by: "admin",
      },
    },
    metadata: {
      supabase_user_id: target.userId,
      specialist_profile_id: target.specialistId,
      smoac_product: input.plan,
      smoac_kind: "plan",
      smoac_plan: input.plan,
      plan: input.plan,
      created_by: "admin",
    },
    success_url: `${siteUrl}/specialist-dashboard?billing=success&product=${input.plan}`,
    cancel_url: `${siteUrl}/specialist-dashboard?billing=cancel`,
  });

  if (!session.url) {
    return { ok: false, message: "Could not create a checkout link." };
  }

  const emailed = await sendAdminPlanCheckoutEmail({
    to: target.email,
    firstName: target.firstName || target.displayName,
    planLabel,
    checkoutUrl: session.url,
  });

  return {
    ok: true,
    method: "checkout_link",
    plan: input.plan,
    planLabel,
    checkoutUrl: session.url,
    emailed: emailed.success,
    emailMode: emailed.mode,
    message: emailed.success
      ? `Checkout link for ${planLabel} sent to ${target.email}.`
      : `Checkout link created, but email did not send. Copy the link and share it with ${target.email}.`,
  };
}

/** Clear expired complimentary grants and fall back to Stripe / trial / Free. */
export async function expireDueAdminPlanOverrides(): Promise<number> {
  const { createSupabaseServiceClient } = await import(
    "@/lib/supabase/service"
  );
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("specialist_billing")
    .select("user_id, specialist_profile_id, admin_override_plan")
    .not("admin_override_plan", "is", null)
    .not("admin_override_ends_at", "is", null)
    .lte("admin_override_ends_at", nowIso);

  if (error || !due?.length) {
    if (error) {
      console.warn("[admin plan] override expiry query failed:", error.message);
    }
    return 0;
  }

  const { resolveAndSyncSpecialistPremiumAccess } = await import(
    "@/lib/specialist-premium-trial"
  );

  let expired = 0;
  for (const row of due) {
    const userId = String(row.user_id ?? "").trim();
    if (!userId) continue;
    const stillActive = await readActiveAdminOverride(supabase, userId);
    if (stillActive) continue;

    await clearAdminOverride(supabase, userId);
    const access = await resolveAndSyncSpecialistPremiumAccess(supabase, userId);
    const fallbackPlan = parseMembershipPlan(
      access.isPaid || access.isTrialing ? "premium" : "free"
    );
    const specialistId =
      typeof row.specialist_profile_id === "string"
        ? row.specialist_profile_id
        : null;
    if (specialistId) {
      await applySpecialistMembershipEntitlements(supabase, {
        userId,
        specialistProfileId: specialistId,
        plan: fallbackPlan === "free" && access.isPremium ? "premium" : fallbackPlan,
      });
    }
    expired += 1;
  }

  return expired;
}
