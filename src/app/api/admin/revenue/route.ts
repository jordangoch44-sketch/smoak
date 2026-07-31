import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";
import {
  fetchStripeMrrCents,
  subscriptionGrantsPremium,
} from "@/lib/stripe/sync-subscription";
import { getStripe, getStripePremiumPriceId } from "@/lib/stripe/config";

export interface AdminStripeBillingRow {
  userId: string;
  specialistProfileId: string | null;
  specialistName: string;
  email: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  /** Monthly amount attributed from Stripe price (0 if unknown / not paying) */
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

async function resolvePremiumMonthlyCents(): Promise<number> {
  const priceId = getStripePremiumPriceId();
  const stripe = getStripe();
  if (!stripe || !priceId) return 999; /* known SMOAC Pro list price fallback */
  try {
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ?? 999;
    const interval = price.recurring?.interval;
    const intervalCount = price.recurring?.interval_count ?? 1;
    if (interval === "year") return Math.round(amount / 12);
    if (interval === "week") return Math.round((amount * 52) / 12);
    if (interval === "month" && intervalCount > 1) {
      return Math.round(amount / intervalCount);
    }
    return amount;
  } catch {
    return 999;
  }
}

export async function GET() {
  const supabase = await requireAdminCaller();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const [stripeMrr, billingRes, premiumMonthlyCents] = await Promise.all([
    fetchStripeMrrCents().catch(() => null),
    supabase
      .from("specialist_billing")
      .select(
        "user_id, specialist_profile_id, status, stripe_subscription_id, stripe_price_id, cancel_at_period_end, current_period_end"
      )
      .order("updated_at", { ascending: false }),
    resolvePremiumMonthlyCents(),
  ]);

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
    const isPaying = subscriptionGrantsPremium(status);
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
      stripeSubscriptionId:
        (row.stripe_subscription_id as string | null) ?? null,
      stripePriceId: (row.stripe_price_id as string | null) ?? null,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      currentPeriodEnd: (row.current_period_end as string | null) ?? null,
      monthlyCents: isPaying ? premiumMonthlyCents : 0,
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
            payingCount: stripeMrr.payingCount,
            dataSource: "stripe" as const,
          }
        : null,
    premiumMonthlyCents,
    attributedMrrCents,
    billingRows,
  });
}
