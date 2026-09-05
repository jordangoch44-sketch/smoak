import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "@/lib/stripe/config";
import {
  clearSpecialistSubscription,
  syncSpecialistSubscription,
} from "@/lib/stripe/sync-subscription";
import { activateBoostCampaign } from "@/lib/stripe/activate-boost-campaign";
import { isBoostCampaignProduct } from "@/lib/boost-campaign";

export const runtime = "nodejs";

async function resolveUserIdFromSubscription(
  subscription: Stripe.Subscription
): Promise<{ userId: string; profileId: string | null } | null> {
  const metaUser = subscription.metadata?.supabase_user_id;
  const metaProfile = subscription.metadata?.specialist_profile_id || null;
  if (metaUser) {
    return { userId: metaUser, profileId: metaProfile || null };
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const stripe = getStripe();
  if (!stripe) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const userId = customer.metadata?.supabase_user_id;
  if (!userId) return null;
  return {
    userId,
    profileId: customer.metadata?.specialist_profile_id || null,
  };
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        const userId =
          session.metadata?.supabase_user_id ||
          subscription.metadata?.supabase_user_id;
        if (!userId) break;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (!customerId) break;
        await syncSpecialistSubscription({
          userId,
          specialistProfileId:
            session.metadata?.specialist_profile_id ||
            subscription.metadata?.specialist_profile_id ||
            null,
          customerId,
          subscription,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const resolved = await resolveUserIdFromSubscription(subscription);
        if (!resolved) break;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await syncSpecialistSubscription({
          userId: resolved.userId,
          specialistProfileId: resolved.profileId,
          customerId,
          subscription,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const resolved = await resolveUserIdFromSubscription(subscription);
        if (!resolved) break;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        await clearSpecialistSubscription({
          userId: resolved.userId,
          specialistProfileId: resolved.profileId,
          customerId: customerId ?? null,
        });
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.smoac_kind !== "boost_campaign") break;
        const userId = paymentIntent.metadata.supabase_user_id;
        const product = paymentIntent.metadata.smoac_product;
        if (!userId || !isBoostCampaignProduct(product)) break;
        const days = Number(paymentIntent.metadata.boost_days);
        const dailyCents = Number(paymentIntent.metadata.boost_daily_cents);
        const endsAt =
          paymentIntent.metadata.boost_ends_at ||
          new Date(
            Date.now() +
              (Number.isFinite(days) ? days : 7) * 24 * 60 * 60 * 1000
          ).toISOString();
        await activateBoostCampaign({
          userId,
          specialistProfileId:
            paymentIntent.metadata.specialist_profile_id || null,
          product,
          days: Number.isFinite(days) ? days : 7,
          dailyCents: Number.isFinite(dailyCents) ? dailyCents : 1000,
          paymentIntentId: paymentIntent.id,
          endsAt,
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
