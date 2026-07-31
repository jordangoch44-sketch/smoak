import Stripe from "stripe";
import {
  getStripePriceIdForProduct,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";

let stripeSingleton: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

/** @deprecated Prefer getStripePriceIdForProduct("premium") */
export function getStripePremiumPriceId(): string | null {
  return getStripePriceIdForProduct("premium");
}

export function getStripePriceId(key: SmoacStripeProductKey): string | null {
  return getStripePriceIdForProduct(key);
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

export function getSiteUrlForStripe(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Publishable key for Stripe.js / Payment Element (browser). */
export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
}
