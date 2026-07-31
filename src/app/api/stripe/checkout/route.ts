import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSiteUrlForStripe,
  getStripe,
  getStripePriceId,
  isStripeConfigured,
} from "@/lib/stripe/config";
import {
  assertProductPurchasable,
  ensureSpecialistStripeCustomer,
} from "@/lib/stripe/ensure-customer";
import {
  isMembershipProduct,
  isSmoacStripeProductKey,
  productLabel,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";

/**
 * Create a Stripe Checkout Session for membership or paid placement add-ons.
 * Body: `{ product?: SmoacStripeProductKey }` — defaults to `premium`.
 * Boosts prefer embedded Payment Element via `/api/stripe/subscription-intent`.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable." }, { status: 503 });
  }

  let productKey: SmoacStripeProductKey = "premium";
  try {
    const body = (await request.json()) as { product?: string };
    if (body.product) {
      if (!isSmoacStripeProductKey(body.product)) {
        return NextResponse.json(
          { error: "Unknown product." },
          { status: 400 }
        );
      }
      productKey = body.product;
    }
  } catch {
    /* empty body → premium (legacy clients) */
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRow?.role !== "specialist") {
    return NextResponse.json(
      { error: "Only specialists can purchase marketplace plans." },
      { status: 403 }
    );
  }

  const customer = await ensureSpecialistStripeCustomer({ user });
  if (!customer.ok) {
    return NextResponse.json(
      { error: customer.error },
      { status: customer.status }
    );
  }

  const purchasable = assertProductPurchasable({
    productKey,
    billingPlan: customer.billingPlan,
    billingStatus: customer.billingStatus,
    activeAddons: customer.activeAddons,
  });
  if (!purchasable.ok) {
    return NextResponse.json(
      { error: purchasable.error },
      { status: purchasable.status }
    );
  }

  const priceId = getStripePriceId(productKey);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `${productLabel(productKey)} is not configured in Stripe yet.`,
      },
      { status: 503 }
    );
  }

  const siteUrl = getSiteUrlForStripe();
  const kind = isMembershipProduct(productKey) ? "plan" : "addon";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        specialist_profile_id: customer.specialistProfileId ?? "",
        smoac_product: productKey,
        smoac_kind: kind,
        ...(isMembershipProduct(productKey)
          ? { smoac_plan: productKey, plan: productKey }
          : { smoac_addon: productKey }),
      },
    },
    metadata: {
      supabase_user_id: user.id,
      specialist_profile_id: customer.specialistProfileId ?? "",
      smoac_product: productKey,
      smoac_kind: kind,
      ...(isMembershipProduct(productKey)
        ? { smoac_plan: productKey, plan: productKey }
        : { smoac_addon: productKey }),
    },
    success_url: `${siteUrl}/specialist-dashboard?billing=success&product=${productKey}`,
    cancel_url: `${siteUrl}/specialist-dashboard?billing=cancel`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url, product: productKey });
}
