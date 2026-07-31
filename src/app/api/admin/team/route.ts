import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { isAdminAppRole } from "@/types/auth-roles";
import { getSiteUrlForStripe } from "@/lib/stripe/config";

/**
 * Owner-only admin team management — invite / list / role change / revoke.
 * Uses service role for Auth invite + user_roles upsert.
 */

type AdminTeamRole = "owner_admin" | "staff_admin";

function serviceClient() {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerAdmin() {
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
  if (!roleRow || String(roleRow.role) !== "owner_admin") return null;
  return { userId: user.id, client: supabase };
}

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner admin access required." },
    { status: 403 }
  );
}

function unavailable() {
  return NextResponse.json(
    { ok: false, message: "Supabase is not configured on the server." },
    { status: 503 }
  );
}

function isTeamRole(value: string): value is AdminTeamRole {
  return value === "owner_admin" || value === "staff_admin";
}

export async function GET() {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireOwnerAdmin();
  if (!caller) return forbidden();

  const { data: roles, error } = await service
    .from("user_roles")
    .select("user_id, role, updated_at")
    .in("role", ["owner_admin", "staff_admin"]);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 }
    );
  }

  const userIds = (roles ?? []).map((r) => r.user_id as string);
  const { data: profiles } = userIds.length
    ? await service
        .from("profiles")
        .select("user_id, email, first_name, last_name, display_name")
        .in("user_id", userIds)
    : { data: [] as Array<Record<string, unknown>> };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, p])
  );

  const members = (roles ?? []).map((row) => {
    const profile = profileById.get(row.user_id as string);
    const first = String(profile?.first_name ?? "").trim();
    const last = String(profile?.last_name ?? "").trim();
    const display =
      String(profile?.display_name ?? "").trim() ||
      [first, last].filter(Boolean).join(" ") ||
      String(profile?.email ?? "").split("@")[0] ||
      "Admin";
    return {
      userId: row.user_id as string,
      role: String(row.role) as AdminTeamRole,
      email: String(profile?.email ?? ""),
      displayName: display,
      updatedAt: (row.updated_at as string | null) ?? null,
      isYou: row.user_id === caller.userId,
    };
  });

  members.sort((a, b) => a.email.localeCompare(b.email));

  return NextResponse.json({ ok: true, members });
}

interface PostBody {
  action?: "invite" | "set_role" | "revoke";
  email?: string;
  role?: string;
  userId?: string;
}

export async function POST(request: Request) {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireOwnerAdmin();
  if (!caller) return forbidden();

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (action === "invite") {
    const email = body.email?.trim().toLowerCase() ?? "";
    const role = body.role?.trim() ?? "staff_admin";
    if (!email.includes("@") || !isTeamRole(role)) {
      return NextResponse.json(
        { ok: false, message: "Valid email and role (owner_admin|staff_admin) required." },
        { status: 400 }
      );
    }

    const redirectTo = `${getSiteUrlForStripe()}/internal/login`;
    const { data: invited, error: inviteError } =
      await service.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_as: role },
      });

    if (inviteError) {
      return NextResponse.json(
        { ok: false, message: inviteError.message },
        { status: 502 }
      );
    }

    const userId = invited.user?.id;
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Invite created but no user id returned." },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    const { error: roleError } = await service.from("user_roles").upsert(
      {
        user_id: userId,
        role,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
    if (roleError) {
      return NextResponse.json(
        { ok: false, message: roleError.message },
        { status: 502 }
      );
    }

    await service.from("profiles").upsert(
      {
        user_id: userId,
        email,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true, userId, email, role });
  }

  if (action === "set_role") {
    const userId = body.userId?.trim() ?? "";
    const role = body.role?.trim() ?? "";
    if (!userId || !isTeamRole(role)) {
      return NextResponse.json(
        { ok: false, message: "userId and role required." },
        { status: 400 }
      );
    }
    if (userId === caller.userId) {
      return NextResponse.json(
        { ok: false, message: "You cannot change your own role here." },
        { status: 400 }
      );
    }
    const { error } = await service
      .from("user_roles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    const userId = body.userId?.trim() ?? "";
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "userId required." },
        { status: 400 }
      );
    }
    if (userId === caller.userId) {
      return NextResponse.json(
        { ok: false, message: "You cannot revoke your own admin access." },
        { status: 400 }
      );
    }
    const { error } = await service
      .from("user_roles")
      .update({ role: "client", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
