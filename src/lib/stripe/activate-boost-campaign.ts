import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  campaignPlacementFlags,
  isBoostCampaignProduct,
  type BoostCampaignProduct,
} from "@/lib/boost-campaign";
import {
  entitlementsFromProducts,
  isSmoacStripeProductKey,
} from "@/lib/stripe/products";

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
  const campaign = input.campaign;
  if (!campaign || !isLiveCampaign(campaign)) {
    return {
      featured: input.featured,
      sponsored: input.sponsored,
      categorySpotlight: input.categorySpotlight,
      topRanked: input.topRanked,
    };
  }
  const granted = campaignPlacementFlags(campaign.product);
  return {
    featured: input.featured || granted.featured,
    sponsored: input.sponsored || granted.sponsored,
    categorySpotlight: input.categorySpotlight || granted.categorySpotlight,
    topRanked: input.topRanked,
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
  const granted = campaignPlacementFlags(campaign.product);
  return {
    featured: granted.featured ? false : input.featured,
    sponsored: granted.sponsored ? false : input.sponsored,
    categorySpotlight: granted.categorySpotlight
      ? false
      : input.categorySpotlight,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type ActivatedBoostCampaign = {
  endsAt: string;
  /** Time this payment added to the campaign — refunds take back up to this. */
  addedMs: number;
};

/**
 * Starts a Boost, or extends a live one: new days are added after the current
 * end, and the clock starts when payment clears (not when checkout opened).
 */
export async function activateBoostCampaign(input: {
  userId: string;
  specialistProfileId?: string | null;
  product: BoostCampaignProduct;
  days: number;
  dailyCents: number;
  paymentIntentId: string;
}): Promise<ActivatedBoostCampaign | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error("[boost] activate unavailable — missing service client");
    return null;
  }

  const { data: existing } = await supabase
    .from("specialist_billing")
    .select("boost_campaign_payment_intent_id, boost_campaign_ends_at")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (
    existing?.boost_campaign_payment_intent_id &&
    existing.boost_campaign_payment_intent_id === input.paymentIntentId
  ) {
    return null;
  }

  const now = Date.now();
  const currentEnd = Date.parse(existing?.boost_campaign_ends_at ?? "");
  const startMs = Number.isFinite(currentEnd) && currentEnd > now ? currentEnd : now;
  const addedMs = Math.max(1, input.days) * DAY_MS;
  const endsAt = new Date(startMs + addedMs).toISOString();

  const { error: billingError } = await supabase
    .from("specialist_billing")
    .upsert(
      {
        user_id: input.userId,
        specialist_profile_id: input.specialistProfileId ?? null,
        boost_campaign_product: input.product,
        boost_campaign_ends_at: endsAt,
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
      endsAt,
      paymentIntentId: input.paymentIntentId,
    },
  });

  const profilePatch = {
    featured: merged.featured,
    sponsored: merged.sponsored,
    category_spotlight: merged.categorySpotlight,
    boost_campaign_product: input.product,
    boost_campaign_ends_at: endsAt,
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

  return { endsAt, addedMs };
}

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

type EndedBoostProfileRow = {
  id: string;
  user_id: string | null;
  featured: boolean | null;
  sponsored: boolean | null;
  category_spotlight: boolean | null;
  boost_campaign_product: string | null;
  boost_campaign_ends_at: string | null;
};

const ENDED_BOOST_PROFILE_COLUMNS =
  "id, user_id, featured, sponsored, category_spotlight, boost_campaign_product, boost_campaign_ends_at";

/** Drop Boost placements from one profile, keeping any monthly add-on flags. */
async function clearEndedBoostProfile(
  supabase: ServiceClient,
  row: EndedBoostProfileRow,
  nowIso: string
): Promise<boolean> {
  const flags = applyCampaignExpiryToTrainerFlags({
    featured: Boolean(row.featured),
    sponsored: Boolean(row.sponsored),
    categorySpotlight: Boolean(row.category_spotlight),
    campaignProduct: row.boost_campaign_product,
    campaignEndsAt: row.boost_campaign_ends_at,
  });
  let featured = flags.featured;
  let sponsored = flags.sponsored;
  let categorySpotlight = flags.categorySpotlight;
  if (row.user_id) {
    const { data: billing } = await supabase
      .from("specialist_billing")
      .select("active_addons")
      .eq("user_id", row.user_id)
      .maybeSingle();
    const addons = Array.isArray(billing?.active_addons)
      ? billing.active_addons.filter(
          (item): item is string => typeof item === "string"
        )
      : [];
    const monthly = entitlementsFromProducts(
      addons.filter(isSmoacStripeProductKey)
    );
    featured = featured || monthly.featured;
    sponsored = sponsored || monthly.sponsored;
    categorySpotlight = categorySpotlight || monthly.categorySpotlight;
  }
  const { error: profileError } = await supabase
    .from("specialist_profiles")
    .update({
      featured,
      sponsored,
      category_spotlight: categorySpotlight,
      boost_campaign_product: null,
      boost_campaign_ends_at: null,
      updated_at: nowIso,
    })
    .eq("id", row.id);
  if (profileError) {
    console.error("[boost] expire profile failed:", profileError.message);
    return false;
  }
  if (row.user_id) {
    const { error: billingError } = await supabase
      .from("specialist_billing")
      .update({
        boost_campaign_product: null,
        boost_campaign_ends_at: null,
        updated_at: nowIso,
      })
      .eq("user_id", row.user_id);
    if (billingError) {
      console.error("[boost] expire billing failed:", billingError.message);
    }
  }
  return true;
}

/**
 * Take refunded or disputed Boost time back off the live campaign.
 * Ends the Boost immediately when nothing paid for is left.
 */
export async function revokeBoostCampaignTime(input: {
  userId: string;
  specialistProfileId?: string | null;
  revokeMs: number;
}): Promise<{ endsAt: string | null } | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error("[boost] revoke unavailable — missing service client");
    return null;
  }

  const { data: billing } = await supabase
    .from("specialist_billing")
    .select("boost_campaign_ends_at")
    .eq("user_id", input.userId)
    .maybeSingle();

  const now = Date.now();
  const currentEnd = Date.parse(billing?.boost_campaign_ends_at ?? "");
  if (!Number.isFinite(currentEnd) || currentEnd <= now) {
    return { endsAt: null };
  }

  const nextEnd = currentEnd - Math.max(0, input.revokeMs);
  const nowIso = new Date(now).toISOString();

  if (nextEnd > now) {
    const endsAt = new Date(nextEnd).toISOString();
    await supabase
      .from("specialist_billing")
      .update({ boost_campaign_ends_at: endsAt, updated_at: nowIso })
      .eq("user_id", input.userId);
    const profileQuery = supabase
      .from("specialist_profiles")
      .update({ boost_campaign_ends_at: endsAt, updated_at: nowIso });
    const { error } = input.specialistProfileId
      ? await profileQuery.eq("id", input.specialistProfileId)
      : await profileQuery.eq("user_id", input.userId);
    if (error) {
      console.error("[boost] revoke profile update failed:", error.message);
    }
    return { endsAt };
  }

  const endedIso = new Date(now - 1).toISOString();
  const profileSelect = supabase
    .from("specialist_profiles")
    .select(ENDED_BOOST_PROFILE_COLUMNS);
  const { data: profile } = input.specialistProfileId
    ? await profileSelect.eq("id", input.specialistProfileId).maybeSingle()
    : await profileSelect.eq("user_id", input.userId).maybeSingle();

  if (profile) {
    await clearEndedBoostProfile(
      supabase,
      { ...(profile as EndedBoostProfileRow), boost_campaign_ends_at: endedIso },
      nowIso
    );
  } else {
    await supabase
      .from("specialist_billing")
      .update({
        boost_campaign_product: null,
        boost_campaign_ends_at: null,
        updated_at: nowIso,
      })
      .eq("user_id", input.userId);
  }
  return { endsAt: null };
}

/** Clear timed Boost flags after `boost_campaign_ends_at`. Safe to run daily. */
export async function expireEndedBoostCampaigns(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("specialist_profiles")
    .select(ENDED_BOOST_PROFILE_COLUMNS)
    .not("boost_campaign_ends_at", "is", null)
    .lt("boost_campaign_ends_at", now);

  if (error) {
    console.error("[boost] expire query failed:", error.message);
    return 0;
  }

  let expired = 0;
  for (const row of (rows ?? []) as EndedBoostProfileRow[]) {
    if (await clearEndedBoostProfile(supabase, row, now)) expired += 1;
  }
  return expired;
}
