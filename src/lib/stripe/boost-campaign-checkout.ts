import {
  BOOST_CAMPAIGN_ALL,
  BOOST_CAMPAIGN_LABEL,
  boostCampaignPayCents,
  clampBoostDailyCents,
  clampBoostDays,
  formatBoostUsd,
  isBoostCampaignProduct,
  type BoostCampaignProduct,
} from "@/lib/boost-campaign";

export type BoostCampaignCheckout = {
  clientSecret: string;
  product: BoostCampaignProduct;
  label: string;
  days: number;
  dailyCents: number;
  listCents: number;
  payCents: number;
  priceLabel: string;
  proPlusDiscount: boolean;
};

export async function createBoostCampaignCheckout(input: {
  days: number;
  dailyCents: number;
}): Promise<
  | { ok: true; checkout: BoostCampaignCheckout }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/stripe/boost-campaign-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        days: clampBoostDays(input.days),
        dailyCents: clampBoostDailyCents(input.dailyCents),
      }),
    });
    const data = (await res.json()) as BoostCampaignCheckout & {
      error?: string;
    };
    if (!res.ok || !data.clientSecret) {
      return {
        ok: false,
        error: data.error ?? "Checkout is not available yet.",
      };
    }
    const product = isBoostCampaignProduct(data.product)
      ? data.product
      : BOOST_CAMPAIGN_ALL;
    return {
      ok: true,
      checkout: {
        clientSecret: data.clientSecret,
        product,
        label: data.label || BOOST_CAMPAIGN_LABEL,
        days: data.days,
        dailyCents: data.dailyCents,
        listCents: data.listCents,
        payCents: data.payCents,
        priceLabel:
          data.priceLabel ||
          formatBoostUsd(
            boostCampaignPayCents(
              data.dailyCents,
              data.days,
              Boolean(data.proPlusDiscount)
            )
          ),
        proPlusDiscount: Boolean(data.proPlusDiscount),
      },
    };
  } catch {
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}
