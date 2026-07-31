import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import {
  isAddonProduct,
  isMembershipProduct,
  isSmoacStripeProductKey,
  listPriceCents,
  productLabel,
  resolveProductKeyFromStripe,
  type SmoacAddonProduct,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";
import { subscriptionGrantsPremium } from "@/lib/stripe/sync-subscription";

export interface SpecialistBillingLine {
  product: SmoacStripeProductKey;
  label: string;
  kind: "plan" | "addon";
  monthlyCents: number;
  status: string;
}

/**
 * Specialist-facing billing / ad spend summary for profile settings.
 */
export async function GET() {
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
    return NextResponse.json({ error: "Specialists only." }, { status: 403 });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Billing unavailable." }, { status: 503 });
  }

  const { data: billing } = await service
    .from("specialist_billing")
    .select(
      "plan, active_addons, status, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const lines: SpecialistBillingLine[] = [];
  let membershipMonthlyCents = 0;
  let adSpendMonthlyCents = 0;

  /* Prefer live Stripe subscriptions when configured */
  if (isStripeConfigured() && billing?.stripe_customer_id) {
    const stripe = getStripe();
    if (stripe) {
      const list = await stripe.subscriptions.list({
        customer: billing.stripe_customer_id,
        status: "all",
        limit: 40,
        expand: ["data.items.data.price"],
      });

      for (const sub of list.data) {
        if (!subscriptionGrantsPremium(sub.status)) continue;
        for (const item of sub.items.data) {
          const priceId = item.price?.id ?? null;
          const key =
            resolveProductKeyFromStripe({
              priceId,
              metadata: {
                ...(item.price?.metadata ?? {}),
                ...(sub.metadata ?? {}),
              },
            }) ?? null;
          if (!key) continue;
          const amount = item.price?.unit_amount ?? listPriceCents(key);
          const line: SpecialistBillingLine = {
            product: key,
            label: productLabel(key),
            kind: isMembershipProduct(key) ? "plan" : "addon",
            monthlyCents: amount,
            status: sub.status,
          };
          lines.push(line);
          if (isMembershipProduct(key)) membershipMonthlyCents += amount;
          else adSpendMonthlyCents += amount;
        }
      }
    }
  }

  /* Fallback to billing row entitlements if Stripe list empty */
  if (lines.length === 0 && billing) {
    const plan = billing.plan;
    if (plan === "premium" || plan === "platinum") {
      const key = plan as SmoacStripeProductKey;
      const cents = listPriceCents(key);
      lines.push({
        product: key,
        label: productLabel(key),
        kind: "plan",
        monthlyCents: cents,
        status: billing.status ?? "active",
      });
      membershipMonthlyCents += cents;
    }
    const addons = Array.isArray(billing.active_addons)
      ? (billing.active_addons as string[])
      : [];
    for (const raw of addons) {
      if (!isSmoacStripeProductKey(raw) || !isAddonProduct(raw)) continue;
      const cents = listPriceCents(raw);
      lines.push({
        product: raw,
        label: productLabel(raw),
        kind: "addon",
        monthlyCents: cents,
        status: billing.status ?? "active",
      });
      adSpendMonthlyCents += cents;
    }
  }

  const activeAddons = lines
    .filter((l) => l.kind === "addon")
    .map((l) => l.product as SmoacAddonProduct);

  return NextResponse.json({
    ok: true,
    plan: billing?.plan ?? "free",
    status: billing?.status ?? "none",
    currentPeriodEnd: billing?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
    activeAddons,
    lines,
    membershipMonthlyCents,
    adSpendMonthlyCents,
    totalMonthlyCents: membershipMonthlyCents + adSpendMonthlyCents,
    hasStripeCustomer: Boolean(billing?.stripe_customer_id),
  });
}
