import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isBoostCampaignProduct,
  type BoostCampaignProduct,
} from "@/lib/boost-campaign";

export type StoredBoostCampaign = {
  product: BoostCampaignProduct;
  endsAt: string;
  paymentIntentId: string;
};

function isLiveCampaign(
  campaign: StoredBoostCampaign | null,
  now = Date.now()
): boolean {
  if (!campaign) return false;
  const ends = Date.parse(campaign.endsAt);
  return Number.isFinite(ends) && ends > now;
}

export function campaignFromBillingRow(row: {
  boost_campaign_product?: string | null;
  boost_campaign_ends_at?: string | null;
  boost_campaign_payment_intent_id?: string | null;
} | null): StoredBoostCampaign | null {
  if (!row) return null;
  if (!isBoostCampaignProduct(row.boost_campaign_product)) return null;
  if (!row.boost_campaign_ends_at) return null;
  return {
    product: row.boost_campaign_product,
    endsAt: row.boost_campaign_ends_at,
    paymentIntentId: row.boost_campaign_payment_intent_id ?? "",
  };
}

export function mergeCampaignPlacementFlags(input: {
  featured: boolean;
  sponsored: boolean;
  categorySpotlight: boolean;
  topRanked: boolean;
  campaign: StoredBoostCampaign | null;
}): {
  featured: boolean;
  sponsored: boolean;
  categorySpotlight: boolean;
  topRanked: boolean;
} {
  const next = { ...input };
  const campaign = input.campaign;
  if (!campaign || !isLiveCampaign(campaign)) {
    return {
      featured: next.featured,
      sponsored: next.sponsored,
      categorySpotlight: next.categorySpotlight,
      topRanked: next.topRanked,
    };
  }
  switch (campaign.product) {
    case "boosted_profile":
      next.sponsored = true;
      break;
    case "category_spotlight":
      next.categorySpotlight = true;
      break;
    case "homepage_spotlight":
      next.featured = true;
      break;
  }
  return {
    featured: next.featured,
    sponsored: next.sponsored,
    categorySpotlight: next.categorySpotlight,
    topRanked: next.topRanked,
  };
}

export function applyCampaignExpiryToTrainerFlags(input: {
  featured: boolean;
  sponsored: boolean;
  categorySpotlight: boolean;
  campaignProduct?: string | null;
  campaignEndsAt?: string | null;
}): {
  featured: boolean;
  sponsored: boolean;
  categorySpotlight: boolean;
} {
  const campaign = campaignFromBillingRow({
    boost_campaign_product: input.campaignProduct,
    boost_campaign_ends_at: input.campaignEndsAt,
    boost_campaign_payment_intent_id: "",
  });
  if (!campaign || isLiveCampaign(campaign)) {
    return {
      featured: input.featured,
      sponsored: input.sponsored,
      categorySpotlight: input.categorySpotlight,
    };
  }
  return {
    featured:
      campaign.product === "homepage_spotlight" ? false : input.featured,
    sponsored:
      campaign.product === "boosted_profile" ? false : input.sponsored,
    categorySpotlight:
      campaign.product === "category_spotlight"
        ? false
        : input.categorySpotlight,
  };
}

export async function activateBoostCampaign(input: {
  userId: string;
  specialistProfileId?: string | null;
  product: BoostCampaignProduct;
  days: number;
  dailyCents: number;
  paymentIntentId: string;
  endsAt: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error("[boost] activate unavailable — missing service client");
    return;
  }

  const { data: existing } = await supabase
    .from("specialist_billing")
    .select("boost_campaign_payment_intent_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (
    existing?.boost_campaign_payment_intent_id &&
    existing.boost_campaign_payment_intent_id === input.paymentIntentId
  ) {
    return;
  }

  const { error: billingError } = await supabase
    .from("specialist_billing")
    .upsert(
      {
        user_id: input.userId,
        specialist_profile_id: input.specialistProfileId ?? null,
        boost_campaign_product: input.product,
        boost_campaign_ends_at: input.endsAt,
        boost_campaign_daily_cents: input.dailyCents,
        boost_campaign_days: input.days,
        boost_campaign_payment_intent_id: input.paymentIntentId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (billingError) {
    console.error("[boost] billing campaign upsert failed:", billingError.message);
  }

  const { data: profile } = input.specialistProfileId
    ? await supabase
        .from("specialist_profiles")
        .select("featured, sponsored, category_spotlight")
        .eq("id", input.specialistProfileId)
        .maybeSingle()
    : await supabase
        .from("specialist_profiles")
        .select("featured, sponsored, category_spotlight")
        .eq("user_id", input.userId)
        .maybeSingle();

  const merged = mergeCampaignPlacementFlags({
    featured: Boolean(profile?.featured),
    sponsored: Boolean(profile?.sponsored),
    categorySpotlight: Boolean(profile?.category_spotlight),
    topRanked: false,
    campaign: {
      product: input.product,
      endsAt: input.endsAt,
      paymentIntentId: input.paymentIntentId,
    },
  });

  const profilePatch = {
    featured: merged.featured,
    sponsored: merged.sponsored,
    category_spotlight: merged.categorySpotlight,
    boost_campaign_product: input.product,
    boost_campaign_ends_at: input.endsAt,
    updated_at: new Date().toISOString(),
  };

  const query = input.specialistProfileId
    ? supabase
        .from("specialist_profiles")
        .update(profilePatch)
        .eq("id", input.specialistProfileId)
    : supabase
        .from("specialist_profiles")
        .update(profilePatch)
        .eq("user_id", input.userId);

  const { error: profileError } = await query;
  if (profileError) {
    const fallback = {
      featured: merged.featured,
      sponsored: merged.sponsored,
      category_spotlight: merged.categorySpotlight,
      updated_at: new Date().toISOString(),
    };
    const retry = input.specialistProfileId
      ? await supabase
          .from("specialist_profiles")
          .update(fallback)
          .eq("id", input.specialistProfileId)
      : await supabase
          .from("specialist_profiles")
          .update(fallback)
          .eq("user_id", input.userId);
    if (retry.error) {
      console.error("[boost] profile campaign update failed:", retry.error.message);
    }
  }
}

/** Clear timed Boost flags after `boost_campaign_ends_at`. Safe to run daily. */
export async function expireEndedBoostCampaigns(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("specialist_profiles")
    .select(
      "id, user_id, featured, sponsored, category_spotlight, boost_campaign_product, boost_campaign_ends_at"
    )
    .not("boost_campaign_ends_at", "is", null)
    .lt("boost_campaign_ends_at", now);

  if (error) {
    console.error("[boost] expire query failed:", error.message);
    return 0;
  }

  let expired = 0;
  for (const row of rows ?? []) {
    const flags = applyCampaignExpiryToTrainerFlags({
      featured: Boolean(row.featured),
      sponsored: Boolean(row.sponsored),
      categorySpotlight: Boolean(row.category_spotlight),
      campaignProduct: row.boost_campaign_product,
      campaignEndsAt: row.boost_campaign_ends_at,
    });
    const { error: profileError } = await supabase
      .from("specialist_profiles")
      .update({
        featured: flags.featured,
        sponsored: flags.sponsored,
        category_spotlight: flags.categorySpotlight,
        boost_campaign_product: null,
        boost_campaign_ends_at: null,
        updated_at: now,
      })
      .eq("id", row.id);
    if (profileError) {
      console.error("[boost] expire profile failed:", profileError.message);
      continue;
    }
    if (row.user_id) {
      const { error: billingError } = await supabase
        .from("specialist_billing")
        .update({
          boost_campaign_product: null,
          boost_campaign_ends_at: null,
          updated_at: now,
        })
        .eq("user_id", row.user_id);
      if (billingError) {
        console.error("[boost] expire billing failed:", billingError.message);
      }
    }
    expired += 1;
  }
  return expired;
}
