/**
 * Short emails to support@smoac.com so signup and payment alerts
 * show up on a phone without opening admin.
 */
import type { User } from "@supabase/supabase-js";
import { fetchSpecialistApplicationByUserId } from "@/lib/applications/specialist-applications-db";
import {
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { sendOutboundEmail } from "@/lib/email/email-transport";
import { INTERNAL_DASHBOARD_PATH } from "@/lib/internal-routes";
import {
  boostCampaignLabel,
  isBoostCampaignProduct,
} from "@/lib/boost-campaign";
import { SUPPORT_EMAIL } from "@/lib/site-contact";
import { getSiteUrlForStripe } from "@/lib/stripe/config";
import { productLabel, resolveProductKeyFromStripe } from "@/lib/stripe/products";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type Stripe from "stripe";

const CLIENT_SIGNUP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type OpsAlertStatus = "sent" | "duplicate" | "skipped" | "failed";

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function personName(input: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const display = input.displayName?.trim();
  if (display) return display;
  const combined = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  if (combined) return combined;
  const email = input.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] || email;
  return "Someone new";
}

function isRecentAuthUser(user: User): boolean {
  const created = Date.parse(user.created_at ?? "");
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= CLIENT_SIGNUP_WINDOW_MS;
}

type ProfileAlertRow = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  specialist_city?: string | null;
  specialist_type?: string | null;
};

async function loadProfile(userId: string): Promise<ProfileAlertRow | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data, error } = await service
    .from("profiles")
    .select(
      "email, first_name, last_name, display_name, client_city, client_state, specialist_city, specialist_type"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileAlertRow;
}

/**
 * Insert the dedupe key first. Duplicate means this alert already went out.
 * Missing table still allows a send so alerts work before the migration.
 */
async function claimOpsAlert(
  dedupeKey: string,
  kind: string
): Promise<"claimed" | "duplicate" | "unlogged"> {
  const service = createSupabaseServiceClient();
  if (!service) return "unlogged";
  const { error } = await service.from("ops_alert_log").insert({
    dedupe_key: dedupeKey,
    kind,
  });
  if (!error) return "claimed";
  const message = error.message ?? "";
  if (error.code === "23505" || /duplicate key/i.test(message)) {
    return "duplicate";
  }
  if (/42P01|PGRST205|does not exist|schema cache/i.test(message)) {
    console.warn("[ops-alert] ops_alert_log missing — sending without dedupe");
    return "unlogged";
  }
  console.warn("[ops-alert] claim failed", message);
  return "unlogged";
}

async function releaseOpsAlert(dedupeKey: string): Promise<void> {
  const service = createSupabaseServiceClient();
  if (!service) return;
  await service.from("ops_alert_log").delete().eq("dedupe_key", dedupeKey);
}

async function deliverOpsAlert(input: {
  dedupeKey: string;
  kind: string;
  subject: string;
  preview: string;
  title: string;
  lines: string[];
  replyTo?: string;
}): Promise<OpsAlertStatus> {
  const claim = await claimOpsAlert(input.dedupeKey, input.kind);
  if (claim === "duplicate") return "duplicate";

  const text = input.lines.filter((line) => line.trim().length > 0).join("\n");
  const html = wrapTransactionalEmailHtml({
    preheader: input.preview,
    eyebrow: "SMOAC",
    title: input.title,
    bodyHtml: renderEmailParagraphs(input.lines.filter((line) => line.trim())),
    cta: {
      label: "Open internal",
      href: `${getSiteUrlForStripe()}${INTERNAL_DASHBOARD_PATH}`,
    },
    footerNote: "Sent to the SMOAC support inbox.",
  });

  const result = await sendOutboundEmail({
    to: SUPPORT_EMAIL,
    subject: input.subject,
    text,
    html,
    kind: "ops_alert",
    replyTo: input.replyTo,
  });

  if (!result.success) {
    if (claim === "claimed") await releaseOpsAlert(input.dedupeKey);
    return "failed";
  }
  return "sent";
}

/** New client account — one email per auth user. */
export async function notifyOpsClientSignup(user: User): Promise<OpsAlertStatus> {
  try {
    const metaRole = String(user.user_metadata?.role ?? "").trim();
    if (metaRole === "specialist" || metaRole === "admin") return "skipped";
    if (!isRecentAuthUser(user)) return "skipped";

    const service = createSupabaseServiceClient();
    if (service) {
      const { data: roleRow } = await service
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const role = typeof roleRow?.role === "string" ? roleRow.role : "";
      if (role && role !== "client") return "skipped";
    }

    const profile = await loadProfile(user.id);
    const email = (
      profile?.email ||
      user.email ||
      ""
    )
      .trim()
      .toLowerCase();
    const name = personName({
      displayName: profile?.display_name,
      firstName:
        profile?.first_name ||
        (typeof user.user_metadata?.first_name === "string"
          ? user.user_metadata.first_name
          : ""),
      lastName:
        profile?.last_name ||
        (typeof user.user_metadata?.last_name === "string"
          ? user.user_metadata.last_name
          : ""),
      email,
    });
    const place = [profile?.client_city, profile?.client_state]
      .map((part) => part?.trim() ?? "")
      .filter(Boolean)
      .join(", ");

    return deliverOpsAlert({
      dedupeKey: `signup:client:${user.id}`,
      kind: "signup_client",
      subject: `New client · ${name}`,
      preview: email || name,
      title: name,
      replyTo: email.includes("@") ? email : undefined,
      lines: [name, email, place, "New client account."].filter(
        (line) => line.trim().length > 0
      ),
    });
  } catch (error) {
    console.warn("[ops-alert] client signup", error);
    return "failed";
  }
}

/** Specialist application submitted for review — one email per account. */
export async function notifyOpsSpecialistApplication(
  user: User
): Promise<OpsAlertStatus> {
  try {
    const service = createSupabaseServiceClient();
    if (!service) return "failed";
    const loaded = await fetchSpecialistApplicationByUserId(service, user.id);
    if (!loaded.ok || !loaded.application) return "skipped";
    const application = loaded.application;
    if (application.profileStatus !== "PENDING_APPROVAL") return "skipped";

    const email = (application.email || user.email || "").trim().toLowerCase();
    const name = personName({
      displayName: application.displayName,
      firstName: application.fullName,
      email,
    });
    const place = [application.city, application.state]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");
    const profession = application.professionalType.trim();

    return deliverOpsAlert({
      dedupeKey: `signup:specialist:${user.id}`,
      kind: "signup_specialist",
      subject: `New specialist · ${name}`,
      preview: [email, place].filter(Boolean).join(" · ") || name,
      title: name,
      replyTo: email.includes("@") ? email : undefined,
      lines: [
        name,
        email,
        [place, profession].filter(Boolean).join(" · "),
        "New specialist application.",
      ].filter((line) => line.trim().length > 0),
    });
  } catch (error) {
    console.warn("[ops-alert] specialist application", error);
    return "failed";
  }
}

function subscriptionAmountCents(subscription: Stripe.Subscription): number {
  let total = 0;
  for (const item of subscription.items?.data ?? []) {
    const unit = item.price?.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    total += unit * qty;
  }
  return total;
}

function subscriptionJustPaid(
  eventType: string,
  subscription: Stripe.Subscription,
  previousStatus?: string | null
): boolean {
  if (subscription.status !== "active") return false;
  if (eventType === "checkout.session.completed") return true;
  if (eventType === "customer.subscription.updated") {
    return (
      previousStatus === "incomplete" || previousStatus === "incomplete_expired"
    );
  }
  return false;
}

/** First successful Pro / PRO+ / add-on subscription charge. */
export async function notifyOpsSubscriptionPayment(input: {
  eventType: string;
  subscription: Stripe.Subscription;
  userId: string;
  previousStatus?: string | null;
  amountCents?: number | null;
}): Promise<OpsAlertStatus> {
  try {
    if (
      !subscriptionJustPaid(
        input.eventType,
        input.subscription,
        input.previousStatus
      )
    ) {
      return "skipped";
    }

    const productKey = resolveProductKeyFromStripe({
      metadata: (input.subscription.metadata ?? {}) as Record<string, string>,
      priceId: input.subscription.items?.data?.[0]?.price?.id ?? null,
    });
    const label = productKey ? productLabel(productKey) : "SMOAC membership";
    const cents =
      typeof input.amountCents === "number" && input.amountCents > 0
        ? input.amountCents
        : subscriptionAmountCents(input.subscription);
    const price =
      cents > 0 ? `${formatUsd(cents)} per month` : "Paid membership";

    const profile = await loadProfile(input.userId);
    const email = (profile?.email ?? "").trim().toLowerCase();
    const name = personName({
      displayName: profile?.display_name,
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      email,
    });
    const place = (profile?.specialist_city || profile?.client_city || "").trim();

    return deliverOpsAlert({
      dedupeKey: `payment:sub:${input.subscription.id}`,
      kind: "payment_subscription",
      subject: `Payment · ${label} · ${name}${cents > 0 ? ` · ${formatUsd(cents)}` : ""}`,
      preview: `${label} · ${price}`,
      title: `${label} · ${name}`,
      replyTo: email.includes("@") ? email : undefined,
      lines: [name, email, place, `${label} · ${price}`].filter(
        (line) => line.trim().length > 0
      ),
    });
  } catch (error) {
    console.warn("[ops-alert] subscription payment", error);
    return "failed";
  }
}

/** One-time Boost campaign charge. */
export async function notifyOpsBoostPayment(
  paymentIntent: Stripe.PaymentIntent
): Promise<OpsAlertStatus> {
  try {
    if (paymentIntent.metadata?.smoac_kind !== "boost_campaign") {
      return "skipped";
    }
    const userId = paymentIntent.metadata.supabase_user_id?.trim();
    if (!userId) return "skipped";
    const product = paymentIntent.metadata.smoac_product?.trim() || "";
    const label = isBoostCampaignProduct(product)
      ? boostCampaignLabel(product)
      : "Boost";
    const days = Number(paymentIntent.metadata.boost_days);
    const cents = paymentIntent.amount_received || paymentIntent.amount || 0;
    const price = cents > 0 ? formatUsd(cents) : "Paid boost";
    const span = Number.isFinite(days) && days > 0 ? `${days}-day boost` : "Boost";

    const profile = await loadProfile(userId);
    const email = (profile?.email ?? "").trim().toLowerCase();
    const name = personName({
      displayName: profile?.display_name,
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      email,
    });
    const place = (profile?.specialist_city || profile?.client_city || "").trim();

    return deliverOpsAlert({
      dedupeKey: `payment:pi:${paymentIntent.id}`,
      kind: "payment_boost",
      subject: `Payment · ${label} · ${name}${cents > 0 ? ` · ${formatUsd(cents)}` : ""}`,
      preview: `${label} · ${price}`,
      title: `${label} · ${name}`,
      replyTo: email.includes("@") ? email : undefined,
      lines: [name, email, place, `${label} · ${price}`, span].filter(
        (line) => line.trim().length > 0
      ),
    });
  } catch (error) {
    console.warn("[ops-alert] boost payment", error);
    return "failed";
  }
}
