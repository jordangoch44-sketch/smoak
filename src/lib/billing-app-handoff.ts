import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import {
  clampBoostDailyCents,
  clampBoostDays,
} from "@/lib/boost-campaign";

/** Long enough to open Safari, short enough that a copied link dies quickly. */
export const BILLING_HANDOFF_TTL_MS = 90_000;

export const BILLING_APP_HANDOFF_PATH = "/auth/app-handoff";

export type BillingHandoffIntent =
  | { kind: "upgrade"; product: "premium" | "platinum" }
  | { kind: "boost"; days: number; dailyCents: number }
  | { kind: "billing" };

export type AppBillingLaunch = BillingHandoffIntent;

type ParamReader = { get(name: string): string | null };

export function parseBillingHandoffIntent(
  input: unknown
): BillingHandoffIntent | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  if (body.kind === "billing") return { kind: "billing" };
  if (body.kind === "upgrade") {
    if (body.product !== "premium" && body.product !== "platinum") return null;
    return { kind: "upgrade", product: body.product };
  }
  if (body.kind === "boost") {
    const days = Number(body.days);
    const dailyCents = Number(body.dailyCents);
    if (!Number.isFinite(days) || !Number.isFinite(dailyCents)) return null;
    return {
      kind: "boost",
      days: clampBoostDays(days),
      dailyCents: clampBoostDailyCents(dailyCents),
    };
  }
  return null;
}

export function intentFromHandoffRow(row: {
  intent: string;
  product: string | null;
  days: number | null;
  daily_cents: number | null;
}): BillingHandoffIntent | null {
  return parseBillingHandoffIntent({
    kind: row.intent,
    product: row.product,
    days: row.days,
    dailyCents: row.daily_cents,
  });
}

/** Dashboard URL Safari should land on after the code is redeemed. */
export function billingHandoffNextPath(intent: BillingHandoffIntent): string {
  if (intent.kind === "upgrade") {
    return `${SPECIALIST_DASHBOARD_PATH}?promo=pro&plan=${intent.product}`;
  }
  if (intent.kind === "boost") {
    return `${SPECIALIST_DASHBOARD_PATH}?promo=boost&days=${intent.days}&daily=${intent.dailyCents}`;
  }
  return `${SPECIALIST_DASHBOARD_PATH}?billing=manage`;
}

/**
 * Launch params written by the app handoff.
 * Plain `?promo=pro` and `?promo=boost` (email and in-app links) stay as they are.
 */
export function readAppBillingLaunch(params: ParamReader): AppBillingLaunch | null {
  if (params.get("billing") === "manage") return { kind: "billing" };

  const promo = params.get("promo");
  if (promo === "pro") {
    const plan = params.get("plan");
    if (plan === "premium" || plan === "platinum") {
      return { kind: "upgrade", product: plan };
    }
    return null;
  }

  if (promo === "boost") {
    const daysRaw = params.get("days");
    const dailyRaw = params.get("daily");
    if (!daysRaw || !dailyRaw) return null;
    const days = Number(daysRaw);
    const dailyCents = Number(dailyRaw);
    if (!Number.isFinite(days) || !Number.isFinite(dailyCents)) return null;
    return {
      kind: "boost",
      days: clampBoostDays(days),
      dailyCents: clampBoostDailyCents(dailyCents),
    };
  }

  return null;
}

/** Drop handoff params after the dashboard opens checkout, and keep the rest. */
export function withoutAppBillingLaunch(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  const launch = readAppBillingLaunch(params);
  if (!launch) return next;
  if (launch.kind === "billing") next.delete("billing");
  if (launch.kind === "upgrade") {
    next.delete("promo");
    next.delete("plan");
  }
  if (launch.kind === "boost") {
    next.delete("promo");
    next.delete("days");
    next.delete("daily");
  }
  return next;
}
