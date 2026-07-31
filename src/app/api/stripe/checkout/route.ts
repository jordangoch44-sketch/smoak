import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  getSiteUrlForStripe,
  getStripe,
  getStripePriceId,
  isStripeConfigured,
} from "@/lib/stripe/config";
import {
  isAddonProduct,
  isMembershipProduct,
  isSmoacStripeProductKey,
  productLabel,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";

/**
 * Create a Stripe Checkout Session for membership or paid placement add-ons.
 * Body: `{ product?: SmoacStripeProductKey }` — defaults to `premium`.
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

  const priceId = getStripePriceId(productKey);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `${productLabel(productKey)} is not configured in Stripe yet.`,
      },
      { status: 503 }
    );
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

  const service = createSupabaseServiceClient();
  let customerId: string | null = null;
  let specialistProfileId: string | null = null;
  let billingPlan: string | null = null;
  let activeAddons: string[] = [];

  if (service) {
    const { data: profile } = await service
      .from("specialist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    specialistProfileId = profile?.id ?? null;

    const { data: billing } = await service
      .from("specialist_billing")
      .select(
        "stripe_customer_id, status, plan, active_addons"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    customerId = billing?.stripe_customer_id ?? null;
    billingPlan = billing?.plan ?? null;
    activeAddons = Array.isArray(billing?.active_addons)
      ? (billing.active_addons as string[])
      : [];

    if (
      isMembershipProduct(productKey) &&
      (billing?.status === "active" || billing?.status === "trialing") &&
      billingPlan === productKey
    ) {
      return NextResponse.json(
        { error: `You already have an active ${productLabel(productKey)} plan.` },
        { status: 409 }
      );
    }

    if (isAddonProduct(productKey) && activeAddons.includes(productKey)) {
      return NextResponse.json(
        { error: `${productLabel(productKey)} is already active.` },
        { status: 409 }
      );
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        supabase_user_id: user.id,
        specialist_profile_id: specialistProfileId ?? "",
      },
    });
    customerId = customer.id;

    if (service) {
      await service.from("specialist_billing").upsert(
        {
          user_id: user.id,
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
  }

  const siteUrl = getSiteUrlForStripe();
  const kind = isMembershipProduct(productKey) ? "plan" : "addon";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        specialist_profile_id: specialistProfileId ?? "",
        smoac_product: productKey,
        smoac_kind: kind,
        ...(isMembershipProduct(productKey)
          ? { smoac_plan: productKey, plan: productKey }
          : { smoac_addon: productKey }),
      },
    },
    metadata: {
      supabase_user_id: user.id,
      specialist_profile_id: specialistProfileId ?? "",
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
