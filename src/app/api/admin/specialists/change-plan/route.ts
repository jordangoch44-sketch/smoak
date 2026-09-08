import { NextResponse } from "next/server";
import { applyAdminPlanOverride, createAdminPlanCheckoutLink } from "@/lib/admin-specialist-plan-change";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { parseMembershipPlan } from "@/lib/specialist-premium";
import { isAdminAppRole } from "@/types/auth-roles";
import type {
  AdminPlanChangeDuration,
  AdminPlanChangeMethod,
} from "@/types/admin-specialist-plan-change";

interface Body {
  specialistId?: string;
  plan?: string;
  method?: AdminPlanChangeMethod;
  duration?: {
    kind?: string;
    days?: number;
  };
}

function parseDuration(
  method: AdminPlanChangeMethod,
  raw: Body["duration"]
): AdminPlanChangeDuration | { error: string } {
  if (method !== "admin_override") {
    return { kind: "indefinite" };
  }
  if (raw?.kind === "indefinite") {
    return { kind: "indefinite" };
  }
  if (raw?.kind === "days") {
    const days = Number(raw.days);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return { error: "Enter a duration between 1 and 3650 days, or choose indefinitely." };
    }
    return { kind: "days", days: Math.floor(days) };
  }
  return { error: "Choose indefinitely or enter a number of days." };
}

/**
 * Admin: change a specialist’s membership via Stripe checkout link or override.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Auth unavailable." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in required." },
      { status: 401 }
    );
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow || !isAdminAppRole(String(roleRow.role))) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const specialistId = body.specialistId?.trim() || "";
  if (!specialistId) {
    return NextResponse.json(
      { ok: false, message: "specialistId is required." },
      { status: 400 }
    );
  }

  const method = body.method;
  if (method !== "checkout_link" && method !== "admin_override") {
    return NextResponse.json(
      { ok: false, message: "Choose checkout link or admin override." },
      { status: 400 }
    );
  }

  const plan = parseMembershipPlan(body.plan);
  if (body.plan !== "free" && body.plan !== "premium" && body.plan !== "platinum") {
    return NextResponse.json(
      { ok: false, message: "Choose Free, Pro, or Pro Plus." },
      { status: 400 }
    );
  }

  if (method === "checkout_link" && plan === "free") {
    return NextResponse.json(
      {
        ok: false,
        message: "Checkout links are for Pro or Pro Plus. Use admin override to move someone to Free.",
      },
      { status: 400 }
    );
  }

  const duration = parseDuration(method, body.duration);
  if ("error" in duration) {
    return NextResponse.json(
      { ok: false, message: duration.error },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const result =
    method === "checkout_link" && (plan === "premium" || plan === "platinum")
      ? await createAdminPlanCheckoutLink({
          supabase: service,
          specialistId,
          plan,
        })
      : await applyAdminPlanOverride({
          supabase: service,
          specialistId,
          plan,
          duration,
          grantedBy: user.id,
        });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
