import type Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminOverrideActive } from "@/lib/admin-plan-override";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { ensureSpecialistStripeCustomer } from "@/lib/stripe/ensure-customer";
import {
  isMembershipProduct,
  membershipPlanLabel,
  productLabel,
  resolveProductKeyFromStripe,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";
import { syncSpecialistCustomerBilling } from "@/lib/stripe/sync-subscription";
import type {
  ManageBillingPayload,
  ManageBillingPaymentMethod,
  ManageBillingSubscription,
} from "@/lib/stripe/manage-billing-types";

type BillingContext = {
  user: User;
  customerId: string | null;
  specialistProfileId: string | null;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  adminOverridePlan: string | null;
  adminOverrideEndsAt: string | null;
  trialEndsAt: string | null;
};

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  if (typeof itemEnd === "number") {
    return new Date(itemEnd * 1000).toISOString();
  }
  const top = (
    subscription as Stripe.Subscription & { current_period_end?: number }
  ).current_period_end;
  return typeof top === "number" ? new Date(top * 1000).toISOString() : null;
}

function productFromSubscription(
  subscription: Stripe.Subscription
): SmoacStripeProductKey | null {
  for (const item of subscription.items.data) {
    const price = item.price;
    const key = resolveProductKeyFromStripe({
      priceId: typeof price?.id === "string" ? price.id : null,
      metadata: {
        ...(typeof price?.metadata === "object" && price.metadata
          ? price.metadata
          : {}),
        ...(subscription.metadata ?? {}),
      } as Record<string, string>,
    });
    if (key) return key;
  }
  return resolveProductKeyFromStripe({
    priceId: subscription.items.data[0]?.price?.id ?? null,
    metadata: (subscription.metadata ?? {}) as Record<string, string>,
  });
}

function monthlyCentsFromSubscription(subscription: Stripe.Subscription): number {
  let total = 0;
  for (const item of subscription.items.data) {
    const amount = item.price?.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    total += amount * qty;
  }
  return total;
}

function mapPaymentMethod(
  pm: Stripe.PaymentMethod | null | undefined
): ManageBillingPaymentMethod | null {
  if (!pm) return null;
  if (pm.card) {
    return {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
  }
  if (pm.type === "link") {
    return {
      brand: "link",
      last4: "",
      expMonth: 0,
      expYear: 0,
    };
  }
  return null;
}

async function resolveDefaultPaymentMethod(
  stripe: Stripe,
  customerId: string,
  membershipSub: Stripe.Subscription | null
): Promise<ManageBillingPaymentMethod | null> {
  const fromObject = (value: unknown): string | null => {
    if (typeof value === "string" && value) return value;
    if (value && typeof value === "object" && "id" in value) {
      const id = (value as { id?: string }).id;
      return typeof id === "string" ? id : null;
    }
    return null;
  };

  let pmId = fromObject(membershipSub?.default_payment_method);

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted) {
    if (!pmId) {
      pmId = fromObject(customer.invoice_settings?.default_payment_method);
    }
  }

  if (pmId) {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    const mapped = mapPaymentMethod(pm);
    if (mapped) return mapped;
  }

  const list = await stripe.paymentMethods.list({
    customer: customerId,
    limit: 10,
  });
  for (const pm of list.data) {
    const mapped = mapPaymentMethod(pm);
    if (mapped) return mapped;
  }
  return null;
}

function displayPlanFor(input: {
  stripePlan: string | null;
  complimentary: ManageBillingPayload["complimentary"];
  billingPlan: string;
}): string {
  if (input.stripePlan === "premium" || input.stripePlan === "platinum") {
    return membershipPlanLabel(input.stripePlan);
  }
  if (input.complimentary === "trial") return "Pro Trial";
  if (
    input.complimentary === "admin" &&
    (input.billingPlan === "premium" || input.billingPlan === "platinum")
  ) {
    return membershipPlanLabel(input.billingPlan);
  }
  if (input.billingPlan === "premium" || input.billingPlan === "platinum") {
    return membershipPlanLabel(input.billingPlan);
  }
  return "Free";
}

export async function requireSpecialistBillingContext(): Promise<
  | { ok: true; ctx: BillingContext }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Auth unavailable." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required." };
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, premium_trial_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRow?.role !== "specialist") {
    return { ok: false, status: 403, error: "Specialists only." };
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false, status: 503, error: "Billing unavailable." };
  }

  const { data: billing } = await service
    .from("specialist_billing")
    .select(
      "plan, status, current_period_end, cancel_at_period_end, stripe_customer_id, specialist_profile_id, admin_override_plan, admin_override_ends_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    ok: true,
    ctx: {
      user,
      customerId: billing?.stripe_customer_id ?? null,
      specialistProfileId: billing?.specialist_profile_id ?? null,
      plan: billing?.plan ?? "free",
      status: billing?.status ?? "none",
      currentPeriodEnd: billing?.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
      adminOverridePlan: billing?.admin_override_plan ?? null,
      adminOverrideEndsAt: billing?.admin_override_ends_at ?? null,
      trialEndsAt: roleRow?.premium_trial_ends_at ?? null,
    },
  };
}

export async function loadManageBilling(
  ctx: BillingContext
): Promise<ManageBillingPayload> {
  const trialMs = ctx.trialEndsAt ? Date.parse(String(ctx.trialEndsAt)) : NaN;
  const trialActive = Number.isFinite(trialMs) && trialMs > Date.now();
  const adminActive = isAdminOverrideActive(
    ctx.adminOverridePlan,
    ctx.adminOverrideEndsAt
  );

  const empty: ManageBillingPayload = {
    stripeConfigured: isStripeConfigured(),
    hasStripeCustomer: Boolean(ctx.customerId),
    displayPlan: displayPlanFor({
      stripePlan: null,
      complimentary: trialActive ? "trial" : adminActive ? "admin" : null,
      billingPlan: ctx.plan,
    }),
    plan: ctx.plan,
    status: ctx.status,
    currentPeriodEnd: ctx.currentPeriodEnd,
    cancelAtPeriodEnd: ctx.cancelAtPeriodEnd,
    complimentary: trialActive ? "trial" : adminActive ? "admin" : null,
    paymentMethod: null,
    membershipSubscriptionId: null,
    subscriptions: [],
    invoices: [],
    canUpdatePaymentMethod: false,
    canCancelMembership: false,
    canResumeMembership: false,
  };

  if (!isStripeConfigured() || !ctx.customerId) {
    return empty;
  }

  const stripe = getStripe();
  if (!stripe) return empty;

  const list = await stripe.subscriptions.list({
    customer: ctx.customerId,
    status: "all",
    limit: 40,
    expand: ["data.items.data.price", "data.default_payment_method"],
  });

  const liveSubs = list.data.filter(
    (sub) =>
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due" ||
      (sub.status === "canceled" && sub.cancel_at_period_end)
  );

  const subscriptions: ManageBillingSubscription[] = [];
  let membershipSub: Stripe.Subscription | null = null;

  for (const sub of liveSubs) {
    const product = productFromSubscription(sub);
    const kind: "plan" | "addon" =
      product && isMembershipProduct(product) ? "plan" : "addon";
    if (kind === "plan" && !membershipSub) membershipSub = sub;
    const label = product
      ? productLabel(product)
      : kind === "plan"
        ? "Membership"
        : "Placement";
    subscriptions.push({
      id: sub.id,
      kind,
      product: product ?? "unknown",
      label,
      status: sub.status,
      monthlyCents: monthlyCentsFromSubscription(sub),
      currentPeriodEnd: periodEndIso(sub),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    });
  }

  if (!membershipSub) {
    membershipSub =
      list.data.find((sub) => {
        const product = productFromSubscription(sub);
        return Boolean(product && isMembershipProduct(product));
      }) ?? null;
  }

  const stripePlanKey =
    membershipSub &&
    (membershipSub.status === "active" ||
      membershipSub.status === "trialing" ||
      membershipSub.status === "past_due")
      ? productFromSubscription(membershipSub)
      : null;
  const stripePlan =
    stripePlanKey && isMembershipProduct(stripePlanKey) ? stripePlanKey : null;

  const complimentary: ManageBillingPayload["complimentary"] = stripePlan
    ? null
    : trialActive
      ? "trial"
      : adminActive
        ? "admin"
        : null;

  const membershipLive =
    membershipSub &&
    (membershipSub.status === "active" ||
      membershipSub.status === "trialing" ||
      membershipSub.status === "past_due");

  const paymentMethod = await resolveDefaultPaymentMethod(
    stripe,
    ctx.customerId,
    membershipSub
  );

  const invoiceList = await stripe.invoices.list({
    customer: ctx.customerId,
    limit: 8,
  });
  const invoices = invoiceList.data
    .filter((inv) => inv.status && inv.status !== "draft")
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      amountCents:
        inv.amount_paid > 0 ? inv.amount_paid : (inv.amount_due ?? 0),
      status: inv.status ?? "open",
      createdAt: new Date(inv.created * 1000).toISOString(),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    }));

  const membershipRow = subscriptions.find((s) => s.kind === "plan") ?? null;

  return {
    stripeConfigured: true,
    hasStripeCustomer: true,
    displayPlan: displayPlanFor({
      stripePlan,
      complimentary,
      billingPlan: ctx.plan,
    }),
    plan: stripePlan ?? ctx.plan,
    status: membershipRow?.status ?? ctx.status,
    currentPeriodEnd:
      membershipRow?.currentPeriodEnd ?? ctx.currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(
      membershipRow?.cancelAtPeriodEnd ?? ctx.cancelAtPeriodEnd
    ),
    complimentary,
    paymentMethod,
    membershipSubscriptionId: membershipLive ? membershipSub?.id ?? null : null,
    subscriptions,
    invoices,
    canUpdatePaymentMethod: true,
    canCancelMembership: Boolean(
      membershipLive && membershipSub && !membershipSub.cancel_at_period_end
    ),
    canResumeMembership: Boolean(
      membershipLive && membershipSub?.cancel_at_period_end
    ),
  };
}

async function requireOwnedSubscription(input: {
  ctx: BillingContext;
  subscriptionId: string;
}): Promise<
  | { ok: true; stripe: Stripe; subscription: Stripe.Subscription }
  | { ok: false; status: number; error: string }
> {
  if (!input.ctx.customerId) {
    return { ok: false, status: 404, error: "No billing account found." };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe unavailable." };
  }
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (customerId !== input.ctx.customerId) {
    return { ok: false, status: 404, error: "Subscription not found." };
  }
  return { ok: true, stripe, subscription };
}

export async function createBillingSetupIntent(
  ctx: BillingContext
): Promise<
  | { ok: true; clientSecret: string }
  | { ok: false; status: number; error: string }
> {
  if (!isStripeConfigured()) {
    return { ok: false, status: 503, error: "Stripe is not configured yet." };
  }

  let customerId = ctx.customerId;
  if (!customerId) {
    const customer = await ensureSpecialistStripeCustomer({ user: ctx.user });
    if (!customer.ok) {
      return {
        ok: false,
        status: customer.status,
        error: customer.error,
      };
    }
    customerId = customer.customerId;
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe unavailable." };
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card", "link"],
    usage: "off_session",
    metadata: {
      supabase_user_id: ctx.user.id,
      smoac_kind: "billing_update",
    },
  });

  if (!setupIntent.client_secret) {
    return { ok: false, status: 500, error: "Could not start card update." };
  }

  return { ok: true, clientSecret: setupIntent.client_secret };
}

export async function saveDefaultPaymentMethod(input: {
  ctx: BillingContext;
  paymentMethodId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!input.paymentMethodId.startsWith("pm_")) {
    return { ok: false, status: 400, error: "Invalid payment method." };
  }
  if (!isStripeConfigured()) {
    return { ok: false, status: 503, error: "Stripe is not configured yet." };
  }

  let customerId = input.ctx.customerId;
  if (!customerId) {
    const customer = await ensureSpecialistStripeCustomer({
      user: input.ctx.user,
    });
    if (!customer.ok) {
      return { ok: false, status: customer.status, error: customer.error };
    }
    customerId = customer.customerId;
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe unavailable." };
  }

  const pm = await stripe.paymentMethods.retrieve(input.paymentMethodId);
  const pmCustomer =
    typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (pmCustomer && pmCustomer !== customerId) {
    return { ok: false, status: 400, error: "Payment method does not match." };
  }
  if (!pmCustomer) {
    await stripe.paymentMethods.attach(input.paymentMethodId, {
      customer: customerId,
    });
  }

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: input.paymentMethodId },
  });

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 40,
  });
  for (const sub of subs.data) {
    if (
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due"
    ) {
      await stripe.subscriptions.update(sub.id, {
        default_payment_method: input.paymentMethodId,
      });
    }
  }

  return { ok: true };
}

export async function setSubscriptionCancelAtPeriodEnd(input: {
  ctx: BillingContext;
  subscriptionId: string;
  cancel: boolean;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const owned = await requireOwnedSubscription({
    ctx: input.ctx,
    subscriptionId: input.subscriptionId,
  });
  if (!owned.ok) return owned;

  if (
    owned.subscription.status !== "active" &&
    owned.subscription.status !== "trialing" &&
    owned.subscription.status !== "past_due"
  ) {
    return {
      ok: false,
      status: 409,
      error: input.cancel
        ? "This plan is not active."
        : "This plan already ended. Start Pro again.",
    };
  }

  await owned.stripe.subscriptions.update(input.subscriptionId, {
    cancel_at_period_end: input.cancel,
  });

  if (input.ctx.customerId) {
    await syncSpecialistCustomerBilling({
      userId: input.ctx.user.id,
      specialistProfileId: input.ctx.specialistProfileId,
      customerId: input.ctx.customerId,
    });
  }

  return { ok: true };
}
