import { NextResponse } from "next/server";
import {
  createBillingSetupIntent,
  loadManageBilling,
  requireSpecialistBillingContext,
  saveDefaultPaymentMethod,
  setSubscriptionCancelAtPeriodEnd,
} from "@/lib/stripe/manage-billing";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSpecialistBillingContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const billing = await loadManageBilling(auth.ctx);
    return NextResponse.json({ ok: true, ...billing });
  } catch (err) {
    console.error("[stripe] load manage billing:", err);
    return NextResponse.json(
      { error: "Could not load billing." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSpecialistBillingContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const ctx = auth.ctx;

  let body: {
    action?: string;
    subscriptionId?: string;
    paymentMethodId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  async function jsonBilling() {
    const refreshed = await requireSpecialistBillingContext();
    const billing = await loadManageBilling(
      refreshed.ok ? refreshed.ctx : ctx
    );
    return { ok: true as const, ...billing };
  }

  try {
    if (body.action === "setup-intent") {
      const result = await createBillingSetupIntent(ctx);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({ ok: true, clientSecret: result.clientSecret });
    }

    if (body.action === "save-payment-method") {
      const paymentMethodId = body.paymentMethodId?.trim() ?? "";
      const result = await saveDefaultPaymentMethod({
        ctx,
        paymentMethodId,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json(await jsonBilling());
    }

    if (body.action === "cancel" || body.action === "resume") {
      const subscriptionId = body.subscriptionId?.trim() ?? "";
      if (!subscriptionId.startsWith("sub_")) {
        return NextResponse.json(
          { error: "Missing subscription." },
          { status: 400 }
        );
      }
      const result = await setSubscriptionCancelAtPeriodEnd({
        ctx,
        subscriptionId,
        cancel: body.action === "cancel",
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json(await jsonBilling());
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("[stripe] manage billing:", err);
    return NextResponse.json(
      { error: "Could not update billing. Try again." },
      { status: 500 }
    );
  }
}
