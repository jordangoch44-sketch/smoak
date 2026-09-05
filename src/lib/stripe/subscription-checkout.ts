import type { SmoacStripeProductKey } from "@/lib/stripe/products";

export type EmbeddedSubscriptionCheckout = {
  clientSecret: string;
  product: SmoacStripeProductKey;
  label: string;
  description: string;
  priceLabel: string;
};

/**
 * Create an incomplete Stripe subscription and return a Payment Element
 * client secret for in-dashboard checkout (wallets + card).
 */
export async function createEmbeddedSubscriptionCheckout(
  product: SmoacStripeProductKey
): Promise<
  | { ok: true; checkout: EmbeddedSubscriptionCheckout }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/stripe/subscription-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    const data = (await res.json()) as EmbeddedSubscriptionCheckout & {
      error?: string;
    };
    if (!res.ok || !data.clientSecret) {
      return {
        ok: false,
        error: data.error ?? "Checkout is not available yet.",
      };
    }
    return {
      ok: true,
      checkout: {
        clientSecret: data.clientSecret,
        product: data.product,
        label: data.label,
        description: data.description,
        priceLabel: data.priceLabel,
      },
    };
  } catch {
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}
