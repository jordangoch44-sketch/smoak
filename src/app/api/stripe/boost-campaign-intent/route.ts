import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { ensureSpecialistStripeCustomer } from "@/lib/stripe/ensure-customer";
import {
  boostCampaignListCents,
  boostCampaignPayCents,
  clampBoostDailyCents,
  clampBoostDays,
  formatBoostUsd,
  getBoostCampaignPlacement,
  isBoostCampaignProduct,
} from "@/lib/boost-campaign";
import { isProPlusPlan } from "@/lib/stripe/pro-plus-boost";

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

  let productKey: string | null = null;
  let days = 7;
  let dailyCents = 1000;
  try {
    const body = (await request.json()) as {
      product?: string;
      days?: number;
      dailyCents?: number;
    };
    productKey = body.product ?? null;
    days = clampBoostDays(Number(body.days));
    dailyCents = clampBoostDailyCents(Number(body.dailyCents));
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isBoostCampaignProduct(productKey)) {
    return NextResponse.json({ error: "Unknown placement." }, { status: 400 });
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
      { error: "Only specialists can boost a profile." },
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

  const proPlus = isProPlusPlan(customer.billingPlan);
  const listCents = boostCampaignListCents(dailyCents, days);
  const payCents = boostCampaignPayCents(dailyCents, days, proPlus);
  const placement = getBoostCampaignPlacement(productKey);
  const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: payCents,
    currency: "usd",
    customer: customer.customerId,
    description: `SMOAC Boost · ${placement.caption} · ${days} days`,
    automatic_payment_methods: { enabled: true },
    metadata: {
      smoac_kind: "boost_campaign",
      smoac_product: productKey,
      smoac_addon: productKey,
      boost_days: String(days),
      boost_daily_cents: String(dailyCents),
      boost_list_cents: String(listCents),
      boost_pay_cents: String(payCents),
      boost_ends_at: endsAt,
      supabase_user_id: user.id,
      specialist_profile_id: customer.specialistProfileId ?? "",
    },
  });

  if (!paymentIntent.client_secret) {
    return NextResponse.json(
      { error: "Could not start payment. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    product: productKey,
    label: placement.caption,
    days,
    dailyCents,
    listCents,
    payCents,
    priceLabel: formatBoostUsd(payCents),
    proPlusDiscount: proPlus,
  });
}
