/**
 * Pro Plus perk: 20% off Boost add-ons.
 * Coupon is attached only while membership is Pro Plus (`platinum` key).
 */

import type Stripe from "stripe";
import {
  formatListPriceLabel,
  isAddonProduct,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";

export const PRO_PLUS_BOOST_PERCENT_OFF = 20;
export const PRO_PLUS_BOOST_COUPON_ID = "smoac_pro_plus_boost_20";

export function isProPlusPlan(
  plan: string | null | undefined
): boolean {
  return plan === "platinum";
}

export function discountedBoostCents(listCents: number): number {
  return Math.round((listCents * (100 - PRO_PLUS_BOOST_PERCENT_OFF)) / 100);
}

export function formatBoostPriceLabel(
  listCents: number,
  proPlus: boolean
): string {
  const cents = proPlus ? discountedBoostCents(listCents) : listCents;
  return formatListPriceLabel(cents);
}

export async function ensureProPlusBoostCoupon(
  stripe: Stripe
): Promise<string> {
  try {
    await stripe.coupons.retrieve(PRO_PLUS_BOOST_COUPON_ID);
    return PRO_PLUS_BOOST_COUPON_ID;
  } catch {
    await stripe.coupons.create({
      id: PRO_PLUS_BOOST_COUPON_ID,
      percent_off: PRO_PLUS_BOOST_PERCENT_OFF,
      duration: "forever",
      name: "Pro Plus Boost 20%",
    });
    return PRO_PLUS_BOOST_COUPON_ID;
  }
}

function subscriptionHasProPlusBoostCoupon(
  subscription: Stripe.Subscription
): boolean {
  const raw = subscription as unknown as {
    discounts?: unknown;
    discount?: { coupon?: string | { id?: string } | null } | null;
  };
  if (Array.isArray(raw.discounts)) {
    return raw.discounts.some((item) => {
      if (!item || typeof item === "string") return false;
      const coupon = (item as { coupon?: string | { id?: string } | null }).coupon;
      if (typeof coupon === "string") return coupon === PRO_PLUS_BOOST_COUPON_ID;
      return coupon?.id === PRO_PLUS_BOOST_COUPON_ID;
    });
  }
  const legacy = raw.discount?.coupon;
  if (typeof legacy === "string") return legacy === PRO_PLUS_BOOST_COUPON_ID;
  return legacy?.id === PRO_PLUS_BOOST_COUPON_ID;
}

export async function syncBoostCouponsForMembership(input: {
  stripe: Stripe;
  subscriptions: readonly Stripe.Subscription[];
  productKeysBySubscription: ReadonlyMap<string, readonly SmoacStripeProductKey[]>;
  plan: string;
}): Promise<void> {
  const wantDiscount = isProPlusPlan(input.plan);
  let couponId: string | null = null;
  if (wantDiscount) {
    try {
      couponId = await ensureProPlusBoostCoupon(input.stripe);
    } catch (err) {
      console.error("[stripe] Pro Plus boost coupon unavailable:", err);
      return;
    }
  }

  for (const sub of input.subscriptions) {
    const keys = input.productKeysBySubscription.get(sub.id) ?? [];
    if (!keys.some((key) => isAddonProduct(key))) continue;

    const hasCoupon = subscriptionHasProPlusBoostCoupon(sub);
    if (wantDiscount && couponId && !hasCoupon) {
      try {
        await input.stripe.subscriptions.update(sub.id, {
          discounts: [{ coupon: couponId }],
        });
      } catch (err) {
        console.error("[stripe] failed to apply Pro Plus boost coupon:", err);
      }
    } else if (!wantDiscount && hasCoupon) {
      try {
        await input.stripe.subscriptions.update(sub.id, {
          discounts: "",
        } as Stripe.SubscriptionUpdateParams);
      } catch (err) {
        console.error("[stripe] failed to remove Pro Plus boost coupon:", err);
      }
    }
  }
}
