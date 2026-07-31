#!/usr/bin/env node
/**
 * Creates all SMOAC specialist Stripe products + monthly prices (test or live).
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs
 *
 * Prints env vars to add to .env.local / Vercel.
 *
 * Safe to re-run: looks up existing products by metadata.smoac_product.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });

/** @type {const} */
const CATALOG = [
  {
    key: "premium",
    name: "SMOAC Pro",
    description:
      "Specialist premium analytics, ranking intelligence, and growth insights.",
    unitAmount: 999,
    env: "STRIPE_PRICE_PREMIUM",
    kind: "plan",
  },
  {
    key: "platinum",
    name: "SMOAC Platinum",
    description: "Pro analytics plus featured marketplace placement.",
    unitAmount: 1999,
    env: "STRIPE_PRICE_PLATINUM",
    kind: "plan",
  },
  {
    key: "boosted_profile",
    name: "Boosted profile",
    description: "Homepage Sponsored rail placement.",
    unitAmount: 4900,
    env: "STRIPE_PRICE_BOOSTED_PROFILE",
    kind: "addon",
  },
  {
    key: "category_spotlight",
    name: "Category spotlight",
    description: "Priority placement within specialty category.",
    unitAmount: 9900,
    env: "STRIPE_PRICE_CATEGORY_SPOTLIGHT",
    kind: "addon",
  },
  {
    key: "homepage_spotlight",
    name: "Homepage spotlight",
    description: "Featured homepage / discovery spotlight.",
    unitAmount: 19900,
    env: "STRIPE_PRICE_HOMEPAGE_SPOTLIGHT",
    kind: "addon",
  },
  {
    key: "top_ranking_boost",
    name: "Top ranking boost",
    description: "Elevated city ranking placement.",
    unitAmount: 14900,
    env: "STRIPE_PRICE_TOP_RANKING_BOOST",
    kind: "addon",
  },
];

async function findExistingProduct(productKey) {
  let startingAfter;
  for (let page = 0; page < 10; page += 1) {
    const list = await stripe.products.list({
      limit: 100,
      starting_after: startingAfter,
      active: true,
    });
    const match = list.data.find(
      (p) =>
        p.metadata?.smoac_product === productKey ||
        (productKey === "premium" && p.metadata?.smoac_plan === "premium")
    );
    if (match) return match;
    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1]?.id;
    if (!startingAfter) break;
  }
  return null;
}

async function findMonthlyPrice(productId, unitAmount) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 20,
  });
  return (
    prices.data.find(
      (p) =>
        p.unit_amount === unitAmount &&
        p.recurring?.interval === "month" &&
        (p.recurring?.interval_count ?? 1) === 1
    ) ?? null
  );
}

const lines = [];

for (const item of CATALOG) {
  let product = await findExistingProduct(item.key);
  if (!product) {
    product = await stripe.products.create({
      name: item.name,
      description: item.description,
      metadata: {
        smoac_product: item.key,
        smoac_kind: item.kind,
        ...(item.kind === "plan" ? { smoac_plan: item.key } : { smoac_addon: item.key }),
      },
    });
    console.log(`Created product ${item.key}: ${product.id}`);
  } else {
    console.log(`Reusing product ${item.key}: ${product.id}`);
  }

  let price = await findMonthlyPrice(product.id, item.unitAmount);
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: item.unitAmount,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        smoac_product: item.key,
        smoac_kind: item.kind,
        ...(item.kind === "plan" ? { smoac_plan: item.key } : { smoac_addon: item.key }),
      },
    });
    console.log(`  Created price: ${price.id}`);
  } else {
    console.log(`  Reusing price: ${price.id}`);
  }

  lines.push(`${item.env}=${price.id}`);
}

console.log("");
console.log("Add to .env.local and Vercel:");
for (const line of lines) {
  console.log(line);
}
