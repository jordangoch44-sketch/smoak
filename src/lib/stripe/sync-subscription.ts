import type Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function subscriptionGrantsPremium(
  status: string | null | undefined
): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status));
}

/**
 * Upsert billing row + sync specialist_profiles.is_premium / user_roles.is_premium.
 */
export async function syncSpecialistSubscription(input: {
  userId: string;
  specialistProfileId?: string | null;
  customerId: string;
  subscription: Stripe.Subscription;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error("[stripe] service client unavailable — cannot sync billing");
    return;
  }

  const status = input.subscription.status;
  const priceId =
    typeof input.subscription.items.data[0]?.price?.id === "string"
      ? input.subscription.items.data[0].price.id
      : null;
  const periodEndSec = (
    input.subscription as Stripe.Subscription & {
      current_period_end?: number;
    }
  ).current_period_end;
  const currentPeriodEnd =
    typeof periodEndSec === "number"
      ? new Date(periodEndSec * 1000).toISOString()
      : null;

  const { error: billingError } = await supabase.from("specialist_billing").upsert(
    {
      user_id: input.userId,
      specialist_profile_id: input.specialistProfileId ?? null,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscription.id,
      stripe_price_id: priceId,
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(input.subscription.cancel_at_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (billingError) {
    console.error("[stripe] billing upsert failed:", billingError.message);
  }

  const isPremium = subscriptionGrantsPremium(status);

  const { error: roleError } = await supabase
    .from("user_roles")
    .update({ is_premium: isPremium })
    .eq("user_id", input.userId);

  if (roleError) {
    console.error("[stripe] user_roles is_premium sync failed:", roleError.message);
  }

  /* Prefer explicit profile id from metadata; else match by user_id */
  if (input.specialistProfileId) {
    const { error } = await supabase
      .from("specialist_profiles")
      .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
      .eq("id", input.specialistProfileId);
    if (error) {
      console.error("[stripe] profile is_premium sync failed:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("specialist_profiles")
      .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
      .eq("user_id", input.userId);
    if (error) {
      console.error("[stripe] profile is_premium sync failed:", error.message);
    }
  }
}

export async function clearSpecialistSubscription(input: {
  userId: string;
  specialistProfileId?: string | null;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  await supabase
    .from("specialist_billing")
    .update({
      status: "canceled",
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);

  await supabase
    .from("user_roles")
    .update({ is_premium: false })
    .eq("user_id", input.userId);

  if (input.specialistProfileId) {
    await supabase
      .from("specialist_profiles")
      .update({ is_premium: false, updated_at: new Date().toISOString() })
      .eq("id", input.specialistProfileId);
  } else {
    await supabase
      .from("specialist_profiles")
      .update({ is_premium: false, updated_at: new Date().toISOString() })
      .eq("user_id", input.userId);
  }
}

/** Sum active/trialing subscription amounts for admin MRR (cents). */
export async function fetchStripeMrrCents(): Promise<{
  mrrCents: number;
  payingCount: number;
  dataSource: "stripe" | "unavailable";
} | null> {
  const { getStripe } = await import("@/lib/stripe/config");
  const stripe = getStripe();
  if (!stripe) return null;

  let mrrCents = 0;
  let payingCount = 0;
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const list = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.items.data.price"],
    });

    for (const sub of list.data) {
      if (!subscriptionGrantsPremium(sub.status)) continue;
      payingCount += 1;
      for (const item of sub.items.data) {
        const amount = item.price?.unit_amount ?? 0;
        const qty = item.quantity ?? 1;
        /* Normalize to monthly */
        const interval = item.price?.recurring?.interval;
        const intervalCount = item.price?.recurring?.interval_count ?? 1;
        let monthly = amount * qty;
        if (interval === "year") monthly = Math.round((amount * qty) / 12);
        else if (interval === "week") monthly = Math.round((amount * qty * 52) / 12);
        else if (interval === "day") monthly = Math.round((amount * qty * 30) / intervalCount);
        else if (interval === "month" && intervalCount > 1) {
          monthly = Math.round((amount * qty) / intervalCount);
        }
        mrrCents += monthly;
      }
    }

    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  return { mrrCents, payingCount, dataSource: "stripe" };
}
