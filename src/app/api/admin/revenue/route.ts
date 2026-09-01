import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";
import {
  fetchStripeMrrCents,
  subscriptionGrantsPremium,
} from "@/lib/stripe/sync-subscription";
import { getStripe } from "@/lib/stripe/config";
import {
  getStripePriceIdForProduct,
  listPriceCents,
  SMOAC_STRIPE_PRODUCTS,
  type SmoacAddonProduct,
  type SmoacStripeProductKey,
} from "@/lib/stripe/products";
import {
  SPECIALIST_AD_ADDON_CATALOG,
} from "@/data/admin-specialist-billing-catalog";
import type { SpecialistAdAddOnId } from "@/types/admin-specialist-billing";

export interface AdminStripeBillingRow {
  userId: string;
  specialistProfileId: string | null;
  specialistName: string;
  email: string;
  status: string;
  plan: "free" | "premium" | "platinum";
  activeAddOns: SpecialistAdAddOnId[];
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  membershipCents: number;
  addonCents: number;
  /** Membership + add-ons for paying Stripe rows */
  monthlyCents: number;
  isPaying: boolean;
}

async function requireAdminCaller() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow || !isAdminAppRole(String(roleRow.role))) return null;
  return supabase;
}

function monthlyFromStripePrice(amount: number, interval?: string | null, intervalCount = 1): number {
  if (interval === "year") return Math.round(amount / 12);
  if (interval === "week") return Math.round((amount * 52) / 12);
  if (interval === "month" && intervalCount > 1) {
    return Math.round(amount / intervalCount);
  }
  return amount;
}

async function resolveProductMonthlyCents(
  key: SmoacStripeProductKey
): Promise<number> {
  const catalog = listPriceCents(key);
  const priceId = getStripePriceIdForProduct(key);
  const stripe = getStripe();
  if (!stripe || !priceId) return catalog;
  try {
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ?? catalog;
    return monthlyFromStripePrice(
      amount,
      price.recurring?.interval,
      price.recurring?.interval_count ?? 1
    );
  } catch {
    return catalog;
  }
}

function asPlan(value: string | null | undefined): "free" | "premium" | "platinum" {
  if (value === "premium" || value === "platinum") return value;
  return "free";
}

function asAddonIds(raw: unknown): SpecialistAdAddOnId[] {
  if (!Array.isArray(raw)) return [];
  const ids: SpecialistAdAddOnId[] = [];
  for (const value of raw) {
    const key = String(value);
    if (key in SPECIALIST_AD_ADDON_CATALOG) {
      ids.push(key as SpecialistAdAddOnId);
    }
  }
  return ids;
}

export async function GET() {
  const supabase = await requireAdminCaller();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const priceEntries = await Promise.all(
    SMOAC_STRIPE_PRODUCTS.map(async (key) => [key, await resolveProductMonthlyCents(key)] as const)
  );
  const priceByProduct = Object.fromEntries(priceEntries) as Record<
    SmoacStripeProductKey,
    number
  >;

  const [stripeMrr, billingRes] = await Promise.all([
    fetchStripeMrrCents().catch(() => null),
    supabase
      .from("specialist_billing")
      .select(
        "user_id, specialist_profile_id, status, plan, active_addons, stripe_subscription_id, stripe_price_id, cancel_at_period_end, current_period_end"
      )
      .order("updated_at", { ascending: false }),
  ]);
  const premiumMonthlyCents = priceByProduct.premium;

  if (billingRes.error) {
    return NextResponse.json(
      { ok: false, message: billingRes.error.message },
      { status: 502 }
    );
  }

  const rawRows = billingRes.data ?? [];
  const userIds = rawRows.map((row) => row.user_id as string);
  const profileIds = rawRows
    .map((row) => row.specialist_profile_id as string | null)
    .filter((id): id is string => Boolean(id));

  const [profilesRes, specialistProfilesRes] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("user_id, email, display_name, first_name, last_name")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    profileIds.length
      ? supabase
          .from("specialist_profiles")
          .select("id, display_name, user_id")
          .in("id", profileIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const profilesByUser = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id as string, p])
  );
  const specialistsById = new Map(
    (specialistProfilesRes.data ?? []).map((p) => [p.id as string, p])
  );

  const billingRows: AdminStripeBillingRow[] = rawRows.map((row) => {
    const userId = row.user_id as string;
    const specialistProfileId =
      (row.specialist_profile_id as string | null) ?? null;
    const status = String(row.status ?? "none");
    const paying = subscriptionGrantsPremium(status);
    const plan = asPlan(row.plan as string | null);
    const activeAddOns = paying
      ? asAddonIds(row.active_addons)
      : [];
    const membershipCents = paying
      ? plan === "platinum"
        ? priceByProduct.platinum
        : plan === "premium"
          ? priceByProduct.premium
          : 0
      : 0;
    const addonCents = activeAddOns.reduce(
      (sum, id) => sum + priceByProduct[id as SmoacAddonProduct],
      0
    );
    const monthlyCents = membershipCents + addonCents;
    const isPaying = monthlyCents > 0;
    const profile = profilesByUser.get(userId);
    const specialist = specialistProfileId
      ? specialistsById.get(specialistProfileId)
      : null;
    const first = String(profile?.first_name ?? "").trim();
    const last = String(profile?.last_name ?? "").trim();
    const specialistName =
      String(specialist?.display_name ?? "").trim() ||
      String(profile?.display_name ?? "").trim() ||
      [first, last].filter(Boolean).join(" ") ||
      String(profile?.email ?? "").split("@")[0] ||
      "Specialist";

    return {
      userId,
      specialistProfileId,
      specialistName,
      email: String(profile?.email ?? ""),
      status,
      plan,
      activeAddOns,
      stripeSubscriptionId:
        (row.stripe_subscription_id as string | null) ?? null,
      stripePriceId: (row.stripe_price_id as string | null) ?? null,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      currentPeriodEnd: (row.current_period_end as string | null) ?? null,
      membershipCents,
      addonCents,
      monthlyCents,
      isPaying,
    };
  });

  billingRows.sort((a, b) => {
    if (a.isPaying !== b.isPaying) return a.isPaying ? -1 : 1;
    return a.specialistName.localeCompare(b.specialistName);
  });

  const payingRows = billingRows.filter((row) => row.isPaying);
  const attributedMrrCents = payingRows.reduce(
    (sum, row) => sum + row.monthlyCents,
    0
  );

  return NextResponse.json({
    ok: true,
    stripeConfigured: Boolean(getStripe()),
    stripe:
      stripeMrr?.dataSource === "stripe"
        ? {
            mrrCents: stripeMrr.mrrCents,
            membershipCents: stripeMrr.membershipCents,
            addonCents: stripeMrr.addonCents,
            payingCount: stripeMrr.payingCount,
            dataSource: "stripe" as const,
          }
        : null,
    premiumMonthlyCents,
    attributedMrrCents,
    billingRows,
  });
}
