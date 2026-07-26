import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  getSiteUrlForStripe,
  getStripe,
  getStripePremiumPriceId,
  isStripeConfigured,
} from "@/lib/stripe/config";

/**
 * Create a Stripe Checkout Session for SMOAC Pro (Premium) with 30-day trial.
 * Authenticated specialists only.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const priceId = getStripePremiumPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Stripe Premium price is not configured (STRIPE_PRICE_PREMIUM)." },
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
      { error: "Only specialists can subscribe to SMOAC Pro." },
      { status: 403 }
    );
  }

  const service = createSupabaseServiceClient();
  let customerId: string | null = null;
  let specialistProfileId: string | null = null;

  if (service) {
    const { data: profile } = await service
      .from("specialist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    specialistProfileId = profile?.id ?? null;

    const { data: billing } = await service
      .from("specialist_billing")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      billing?.status === "active" ||
      billing?.status === "trialing"
    ) {
      return NextResponse.json(
        { error: "You already have an active Pro subscription." },
        { status: 409 }
      );
    }

    customerId = billing?.stripe_customer_id ?? null;
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
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
  }

  const siteUrl = getSiteUrlForStripe();
  /* Signup already includes a 30-day free Pro trial — Checkout is paid only */
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        specialist_profile_id: specialistProfileId ?? "",
        plan: "premium",
      },
    },
    metadata: {
      supabase_user_id: user.id,
      specialist_profile_id: specialistProfileId ?? "",
      plan: "premium",
    },
    success_url: `${siteUrl}/specialist-dashboard?billing=success`,
    cancel_url: `${siteUrl}/specialist-dashboard?billing=cancel`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
