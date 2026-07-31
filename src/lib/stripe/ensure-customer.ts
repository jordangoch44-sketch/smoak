import {
  getStripe,
  getStripePriceId,
  isStripeConfigured,
} from "@/lib/stripe/config";
import {
  isAddonProduct,
  isMembershipProduct,
  productLabel,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { User } from "@supabase/supabase-js";

export async function ensureSpecialistStripeCustomer(input: {
  user: User;
}): Promise<
  | {
      ok: true;
      customerId: string;
      specialistProfileId: string | null;
      billingPlan: string | null;
      activeAddons: string[];
      billingStatus: string | null;
    }
  | { ok: false; status: number; error: string }
> {
  if (!isStripeConfigured()) {
    return { ok: false, status: 503, error: "Stripe is not configured yet." };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe unavailable." };
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false, status: 503, error: "Billing unavailable." };
  }

  const { data: profile } = await service
    .from("specialist_profiles")
    .select("id")
    .eq("user_id", input.user.id)
    .maybeSingle();
  const specialistProfileId = profile?.id ?? null;

  const { data: billing } = await service
    .from("specialist_billing")
    .select("stripe_customer_id, status, plan, active_addons")
    .eq("user_id", input.user.id)
    .maybeSingle();

  let customerId = billing?.stripe_customer_id ?? null;
  const billingPlan = billing?.plan ?? null;
  const activeAddons = Array.isArray(billing?.active_addons)
    ? (billing.active_addons as string[])
    : [];

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.user.email ?? undefined,
      metadata: {
        supabase_user_id: input.user.id,
        specialist_profile_id: specialistProfileId ?? "",
      },
    });
    customerId = customer.id;
    await service.from("specialist_billing").upsert(
      {
        user_id: input.user.id,
        specialist_profile_id: specialistProfileId,
        stripe_customer_id: customerId,
        status: "none",
        plan: "free",
        active_addons: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return {
    ok: true,
    customerId,
    specialistProfileId,
    billingPlan,
    activeAddons,
    billingStatus: billing?.status ?? null,
  };
}

export function assertProductPurchasable(input: {
  productKey: SmoacStripeProductKey;
  billingPlan: string | null;
  billingStatus: string | null;
  activeAddons: string[];
}): { ok: true } | { ok: false; status: number; error: string } {
  const priceId = getStripePriceId(input.productKey);
  if (!priceId) {
    return {
      ok: false,
      status: 503,
      error: `${productLabel(input.productKey)} is not configured in Stripe yet.`,
    };
  }

  if (
    isMembershipProduct(input.productKey) &&
    (input.billingStatus === "active" || input.billingStatus === "trialing") &&
    input.billingPlan === input.productKey
  ) {
    return {
      ok: false,
      status: 409,
      error: `You already have an active ${productLabel(input.productKey)} plan.`,
    };
  }

  if (
    isAddonProduct(input.productKey) &&
    input.activeAddons.includes(input.productKey)
  ) {
    return {
      ok: false,
      status: 409,
      error: `${productLabel(input.productKey)} is already active.`,
    };
  }

  return { ok: true };
}
