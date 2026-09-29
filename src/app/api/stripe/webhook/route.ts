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
import {
  activateBoostCampaign,
  revokeBoostCampaignTime,
} from "@/lib/stripe/activate-boost-campaign";
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
        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          const { notifyOpsSubscriptionPayment } = await import(
            "@/lib/email/ops-alert"
          );
          await notifyOpsSubscriptionPayment({
            eventType: event.type,
            subscription,
            userId,
            amountCents: session.amount_total,
          });
        }
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
        const previous = event.data.previous_attributes as
          | { status?: string }
          | undefined;
        const { notifyOpsSubscriptionPayment } = await import(
          "@/lib/email/ops-alert"
        );
        await notifyOpsSubscriptionPayment({
          eventType: event.type,
          subscription,
          userId: resolved.userId,
          previousStatus: previous?.status ?? null,
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
        /* Stripe can redeliver; the applied marker lives on the live intent. */
        const current = await stripe.paymentIntents.retrieve(paymentIntent.id);
        if (current.metadata?.boost_applied_ms) break;
        const days = Number(paymentIntent.metadata.boost_days);
        const dailyCents = Number(paymentIntent.metadata.boost_daily_cents);
        const activated = await activateBoostCampaign({
          userId,
          specialistProfileId:
            paymentIntent.metadata.specialist_profile_id || null,
          product,
          days: Number.isFinite(days) ? days : 7,
          dailyCents: Number.isFinite(dailyCents) ? dailyCents : 1000,
          paymentIntentId: paymentIntent.id,
        });
        if (activated) {
          await stripe.paymentIntents.update(paymentIntent.id, {
            metadata: {
              boost_applied_ms: String(activated.addedMs),
              boost_applied_ends_at: activated.endsAt,
            },
          });
        }
        const { notifyOpsBoostPayment } = await import("@/lib/email/ops-alert");
        await notifyOpsBoostPayment(paymentIntent);
        break;
      }
      case "charge.refunded":
      case "charge.dispute.created": {
        const object = event.data.object as Stripe.Charge | Stripe.Dispute;
        const paymentIntentId =
          typeof object.payment_intent === "string"
            ? object.payment_intent
            : object.payment_intent?.id;
        if (!paymentIntentId) break;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.metadata?.smoac_kind !== "boost_campaign") break;
        const userId = paymentIntent.metadata.supabase_user_id;
        const appliedMs =
          Number(paymentIntent.metadata.boost_applied_ms) ||
          (paymentIntent.status === "succeeded"
            ? Number(paymentIntent.metadata.boost_days) * 24 * 60 * 60 * 1000
            : 0);
        if (!userId || !Number.isFinite(appliedMs) || appliedMs <= 0) break;

        let refundedShare = 1;
        if (event.type === "charge.refunded") {
          const charge = object as Stripe.Charge;
          refundedShare =
            charge.amount > 0 ? Math.min(1, charge.amount_refunded / charge.amount) : 1;
        }
        /* Refund events report the running total, so revoke only the new part. */
        const targetRevokedMs = Math.round(appliedMs * refundedShare);
        const alreadyRevokedMs = Number(paymentIntent.metadata.boost_revoked_ms) || 0;
        const revokeMs = targetRevokedMs - alreadyRevokedMs;
        if (revokeMs <= 0) break;

        await revokeBoostCampaignTime({
          userId,
          specialistProfileId: paymentIntent.metadata.specialist_profile_id || null,
          revokeMs,
        });
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: { boost_revoked_ms: String(targetRevokedMs) },
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
