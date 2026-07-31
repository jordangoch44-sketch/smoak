import type Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  entitlementsFromProducts,
  isMembershipProduct,
  resolveProductKeyFromStripe,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function subscriptionGrantsPremium(
  status: string | null | undefined
): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status));
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const periodEndSec = (
    subscription as Stripe.Subscription & {
      current_period_end?: number;
    }
  ).current_period_end;
  return typeof periodEndSec === "number"
    ? new Date(periodEndSec * 1000).toISOString()
    : null;
}

function productsFromSubscription(
  subscription: Stripe.Subscription
): SmoacStripeProductKey[] {
  if (!subscriptionGrantsPremium(subscription.status)) return [];

  const keys: SmoacStripeProductKey[] = [];
  for (const item of subscription.items.data) {
    const price = item.price;
    const priceId = typeof price?.id === "string" ? price.id : null;
    const meta = {
      ...(typeof price?.metadata === "object" && price.metadata
        ? price.metadata
        : {}),
      ...(subscription.metadata ?? {}),
    } as Record<string, string>;
    const key = resolveProductKeyFromStripe({ priceId, metadata: meta });
    if (key) keys.push(key);
  }

  /* Legacy: single-item Pro sub with only plan metadata */
  if (keys.length === 0) {
    const legacy = resolveProductKeyFromStripe({
      priceId: subscription.items.data[0]?.price?.id ?? null,
      metadata: (subscription.metadata ?? {}) as Record<string, string>,
    });
    if (legacy) keys.push(legacy);
  }

  return keys;
}

/**
 * List every active/trialing subscription for a customer and derive entitlements.
 * Prefer this after any subscription create/update/delete.
 */
export async function syncSpecialistCustomerBilling(input: {
  userId: string;
  specialistProfileId?: string | null;
  customerId: string;
}): Promise<void> {
  const { getStripe } = await import("@/lib/stripe/config");
  const stripe = getStripe();
  const supabase = createSupabaseServiceClient();
  if (!stripe || !supabase) {
    console.error("[stripe] sync unavailable — missing stripe or service client");
    return;
  }

  const list = await stripe.subscriptions.list({
    customer: input.customerId,
    status: "all",
    limit: 40,
    expand: ["data.items.data.price"],
  });

  const activeSubs = list.data.filter((sub) =>
    subscriptionGrantsPremium(sub.status)
  );

  /* Prefer higher membership; cancel lower-tier membership subs to avoid double bill */
  const membershipSubs = activeSubs.filter((sub) =>
    productsFromSubscription(sub).some(isMembershipProduct)
  );
  const hasPlatinum = membershipSubs.some((sub) =>
    productsFromSubscription(sub).includes("platinum")
  );
  if (hasPlatinum) {
    for (const sub of membershipSubs) {
      const products = productsFromSubscription(sub);
      if (products.includes("premium") && !products.includes("platinum")) {
        try {
          await stripe.subscriptions.cancel(sub.id);
        } catch (err) {
          console.error("[stripe] failed to cancel lower-tier sub:", err);
        }
      }
    }
  }

  const refreshed = hasPlatinum
    ? (
        await stripe.subscriptions.list({
          customer: input.customerId,
          status: "all",
          limit: 40,
          expand: ["data.items.data.price"],
        })
      ).data.filter((sub) => subscriptionGrantsPremium(sub.status))
    : activeSubs;

  const productKeys = [
    ...new Set(refreshed.flatMap((sub) => productsFromSubscription(sub))),
  ];
  const entitlements = entitlementsFromProducts(productKeys);

  const primarySub =
    refreshed.find((sub) =>
      productsFromSubscription(sub).some(isMembershipProduct)
    ) ?? refreshed[0] ?? null;

  const priceId =
    typeof primarySub?.items.data[0]?.price?.id === "string"
      ? primarySub.items.data[0].price.id
      : null;

  const status = primarySub?.status ?? (refreshed.length ? "active" : "canceled");

  const { error: billingError } = await supabase.from("specialist_billing").upsert(
    {
      user_id: input.userId,
      specialist_profile_id: input.specialistProfileId ?? null,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: primarySub?.id ?? null,
      stripe_price_id: priceId,
      status: primarySub ? status : refreshed.length === 0 ? "canceled" : status,
      current_period_end: primarySub ? periodEndIso(primarySub) : null,
      cancel_at_period_end: Boolean(primarySub?.cancel_at_period_end),
      plan: entitlements.plan,
      active_addons: entitlements.activeAddons,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (billingError) {
    console.error("[stripe] billing upsert failed:", billingError.message);
  }

  /* Preserve complimentary trial Pro if Stripe membership is free */
  let isPremium = entitlements.isPremium;
  if (!isPremium) {
    const { data: role } = await supabase
      .from("user_roles")
      .select("premium_trial_ends_at")
      .eq("user_id", input.userId)
      .maybeSingle();
    const ends = role?.premium_trial_ends_at
      ? Date.parse(String(role.premium_trial_ends_at))
      : NaN;
    if (Number.isFinite(ends) && ends > Date.now()) {
      isPremium = true;
    }
  }

  const { error: roleError } = await supabase
    .from("user_roles")
    .update({ is_premium: isPremium })
    .eq("user_id", input.userId);

  if (roleError) {
    console.error("[stripe] user_roles is_premium sync failed:", roleError.message);
  }

  const profilePatch = {
    is_premium: isPremium,
    featured: entitlements.featured,
    sponsored: entitlements.sponsored,
    top_ranked: entitlements.topRanked,
    category_spotlight: entitlements.categorySpotlight,
    updated_at: new Date().toISOString(),
  };

  if (input.specialistProfileId) {
    const { error } = await supabase
      .from("specialist_profiles")
      .update(profilePatch)
      .eq("id", input.specialistProfileId);
    if (error) {
      console.error("[stripe] profile entitlement sync failed:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("specialist_profiles")
      .update(profilePatch)
      .eq("user_id", input.userId);
    if (error) {
      console.error("[stripe] profile entitlement sync failed:", error.message);
    }
  }
}

/**
 * Upsert billing from a single subscription event — re-aggregates all customer subs.
 */
export async function syncSpecialistSubscription(input: {
  userId: string;
  specialistProfileId?: string | null;
  customerId: string;
  subscription: Stripe.Subscription;
}): Promise<void> {
  await syncSpecialistCustomerBilling({
    userId: input.userId,
    specialistProfileId: input.specialistProfileId,
    customerId: input.customerId,
  });
}

export async function clearSpecialistSubscription(input: {
  userId: string;
  specialistProfileId?: string | null;
  customerId?: string | null;
}): Promise<void> {
  if (input.customerId) {
    await syncSpecialistCustomerBilling({
      userId: input.userId,
      specialistProfileId: input.specialistProfileId,
      customerId: input.customerId,
    });
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { data: billing } = await supabase
    .from("specialist_billing")
    .select("stripe_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (billing?.stripe_customer_id) {
    await syncSpecialistCustomerBilling({
      userId: input.userId,
      specialistProfileId: input.specialistProfileId,
      customerId: billing.stripe_customer_id,
    });
    return;
  }

  await supabase
    .from("specialist_billing")
    .update({
      status: "canceled",
      stripe_subscription_id: null,
      plan: "free",
      active_addons: [],
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);

  let isPremium = false;
  const { data: role } = await supabase
    .from("user_roles")
    .select("premium_trial_ends_at")
    .eq("user_id", input.userId)
    .maybeSingle();
  const ends = role?.premium_trial_ends_at
    ? Date.parse(String(role.premium_trial_ends_at))
    : NaN;
  if (Number.isFinite(ends) && ends > Date.now()) {
    isPremium = true;
  }

  await supabase
    .from("user_roles")
    .update({ is_premium: isPremium })
    .eq("user_id", input.userId);

  const profilePatch = {
    is_premium: isPremium,
    featured: false,
    sponsored: false,
    top_ranked: false,
    category_spotlight: false,
    updated_at: new Date().toISOString(),
  };

  if (input.specialistProfileId) {
    await supabase
      .from("specialist_profiles")
      .update(profilePatch)
      .eq("id", input.specialistProfileId);
  } else {
    await supabase
      .from("specialist_profiles")
      .update(profilePatch)
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
        const interval = item.price?.recurring?.interval;
        const intervalCount = item.price?.recurring?.interval_count ?? 1;
        let monthly = amount * qty;
        if (interval === "year") monthly = Math.round((amount * qty) / 12);
        else if (interval === "week")
          monthly = Math.round((amount * qty * 52) / 12);
        else if (interval === "day")
          monthly = Math.round((amount * qty * 30) / intervalCount);
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
