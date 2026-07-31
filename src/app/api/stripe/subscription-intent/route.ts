import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe, getStripePriceId, isStripeConfigured } from "@/lib/stripe/config";
import {
  assertProductPurchasable,
  ensureSpecialistStripeCustomer,
} from "@/lib/stripe/ensure-customer";
import {
  isMembershipProduct,
  isSmoacStripeProductKey,
  listPriceCents,
  productDescription,
  productLabel,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";

/**
 * Create an incomplete subscription and return a PaymentIntent client secret
 * for in-modal Stripe Payment Element checkout.
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

  let productKey: SmoacStripeProductKey | null = null;
  try {
    const body = (await request.json()) as { product?: string };
    if (!body.product || !isSmoacStripeProductKey(body.product)) {
      return NextResponse.json({ error: "Unknown product." }, { status: 400 });
    }
    productKey = body.product;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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

  const priceId = getStripePriceId(productKey)!;
  const kind = isMembershipProduct(productKey) ? "plan" : "addon";
  const metadata = {
    supabase_user_id: user.id,
    specialist_profile_id: customer.specialistProfileId ?? "",
    smoac_product: productKey,
    smoac_kind: kind,
    ...(isMembershipProduct(productKey)
      ? { smoac_plan: productKey, plan: productKey }
      : { smoac_addon: productKey }),
  };

  const subscription = await stripe.subscriptions.create({
    customer: customer.customerId,
    items: [{ price: priceId, quantity: 1 }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
      payment_method_types: ["card"],
    },
    metadata,
    expand: ["latest_invoice.payment_intent"],
  });

  const invoice = subscription.latest_invoice as
    | (Stripe.Invoice & {
        confirmation_secret?: { client_secret?: string | null } | null;
        payment_intent?: Stripe.PaymentIntent | string | null;
      })
    | string
    | null;

  let clientSecret: string | null = null;
  if (invoice && typeof invoice !== "string") {
    const fromConfirmation = invoice.confirmation_secret?.client_secret;
    if (typeof fromConfirmation === "string" && fromConfirmation) {
      clientSecret = fromConfirmation;
    } else {
      const paymentIntent = invoice.payment_intent;
      if (paymentIntent && typeof paymentIntent !== "string") {
        clientSecret = paymentIntent.client_secret;
      }
    }
  }

  if (!clientSecret && typeof subscription.latest_invoice === "string") {
    const fullInvoice = await stripe.invoices.retrieve(
      subscription.latest_invoice,
      { expand: ["payment_intent", "confirmation_secret"] }
    );
    const inv = fullInvoice as Stripe.Invoice & {
      confirmation_secret?: { client_secret?: string | null } | null;
      payment_intent?: Stripe.PaymentIntent | string | null;
    };
    clientSecret =
      inv.confirmation_secret?.client_secret ??
      (inv.payment_intent && typeof inv.payment_intent !== "string"
        ? inv.payment_intent.client_secret
        : null);
  }

  if (!clientSecret) {
    /* Clean up incomplete sub if PI missing */
    try {
      await stripe.subscriptions.cancel(subscription.id);
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      { error: "Could not start payment. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientSecret,
    subscriptionId: subscription.id,
    product: productKey,
    label: productLabel(productKey),
    description: productDescription(productKey),
    priceLabel: `$${(listPriceCents(productKey) / 100).toFixed(
      listPriceCents(productKey) % 100 === 0 ? 0 : 2
    )}/mo`,
    monthlyCents: listPriceCents(productKey),
  });
}
