import {
  boostCampaignPayCents,
  clampBoostDailyCents,
  clampBoostDays,
  formatBoostUsd,
  getBoostCampaignPlacement,
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
  product: string;
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
        product: input.product,
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
    if (!isBoostCampaignProduct(data.product)) {
      return { ok: false, error: "Unknown placement." };
    }
    return {
      ok: true,
      checkout: {
        clientSecret: data.clientSecret,
        product: data.product,
        label: data.label || getBoostCampaignPlacement(data.product).caption,
        days: data.days,
        dailyCents: data.dailyCents,
        listCents: data.listCents,
        payCents: data.payCents,
        priceLabel: data.priceLabel || formatBoostUsd(boostCampaignPayCents(
          data.dailyCents,
          data.days,
          Boolean(data.proPlusDiscount)
        )),
        proPlusDiscount: Boolean(data.proPlusDiscount),
      },
    };
  } catch {
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}
