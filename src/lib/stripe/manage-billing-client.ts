import type { ManageBillingPayload } from "@/lib/stripe/manage-billing-types";

export type ManageBillingResponse = ManageBillingPayload & {
  ok: true;
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? "Billing is not available yet.";
  } catch {
    return "Billing is not available yet.";
  }
}

export async function fetchManageBilling(): Promise<
  | { ok: true; billing: ManageBillingPayload }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/stripe/billing", { credentials: "include" });
    if (!res.ok) {
      return { ok: false, error: await parseError(res) };
    }
    const body = (await res.json()) as ManageBillingPayload & {
      ok?: boolean;
      error?: string;
    };
    if (body.error && !body.ok) {
      return { ok: false, error: body.error };
    }
    return { ok: true, billing: body };
  } catch {
    return { ok: false, error: "Could not load billing. Try again." };
  }
}

export async function postManageBilling(
  body: Record<string, string>
): Promise<
  | { ok: true; billing?: ManageBillingPayload; clientSecret?: string }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/stripe/billing", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ManageBillingPayload & {
      ok?: boolean;
      error?: string;
      clientSecret?: string;
    };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error ?? "Could not update billing." };
    }
    if (data.clientSecret) {
      return { ok: true, clientSecret: data.clientSecret };
    }
    return { ok: true, billing: data };
  } catch {
    return { ok: false, error: "Could not update billing. Try again." };
  }
}
