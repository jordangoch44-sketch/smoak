#!/usr/bin/env node
/**
 * Creates SMOAC Pro product + monthly price in Stripe (test or live).
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs
 *
 * Prints STRIPE_PRICE_PREMIUM to add to .env.local / Vercel.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });

const product = await stripe.products.create({
  name: "SMOAC Pro",
  description:
    "Specialist premium analytics, ranking intelligence, and growth insights.",
  metadata: { smoac_plan: "premium" },
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 999,
  currency: "usd",
  recurring: { interval: "month" },
  metadata: { smoac_plan: "premium" },
});

console.log("Created SMOAC Pro in Stripe.");
console.log(`Product: ${product.id}`);
console.log(`Price:   ${price.id}`);
console.log("");
console.log("Add to .env.local and Vercel:");
console.log(`STRIPE_PRICE_PREMIUM=${price.id}`);
