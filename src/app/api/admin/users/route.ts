import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { isAdminAppRole } from "@/types/auth-roles";
import type { AdminManagedUser } from "@/types/admin-managed-user";

/**
 * Admin user management — requires a signed-in platform admin (cookie session).
 * Service role is server-only: list all accounts, edit, deactivate (ban), delete.
 */

const DEACTIVATE_BAN_DURATION = "876000h"; // ~100 years
const LIFT_BAN_DURATION = "none";

function serviceClient() {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CookieClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

interface AdminCaller {
  userId: string;
  /* user_roles reads go through the caller's session (RLS admin policy) —
   * the service_role grant on user_roles is not applied in all environments. */
  client: CookieClient;
}

/** Resolve the calling admin (cookie session), or null when not an admin. */
async function requireAdminCaller(): Promise<AdminCaller | null> {
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
  return { userId: user.id, client: supabase };
}

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Admin access required." },
    { status: 403 }
  );
}

function unavailable() {
  return NextResponse.json(
    { ok: false, message: "Supabase is not configured on the server." },
    { status: 503 }
  );
}

export async function GET() {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireAdminCaller();
  if (!caller) return forbidden();

  const [{ data: authList, error: authError }, profilesRes, rolesRes, savedRes] =
    await Promise.all([
      service.auth.admin.listUsers({ perPage: 1000 }),
      caller.client
        .from("profiles")
        .select("user_id, email, first_name, last_name, display_name"),
      caller.client.from("user_roles").select("user_id, role"),
      service.from("saved_trainers").select("user_id"),
    ]);

  if (authError) {
    return NextResponse.json(
      { ok: false, message: authError.message },
      { status: 502 }
    );
  }

  const profilesById = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id as string, p])
  );
  const rolesById = new Map(
    (rolesRes.data ?? []).map((r) => [r.user_id as string, String(r.role)])
  );
  const savedCounts = new Map<string, number>();
  for (const row of savedRes.data ?? []) {
    const id = row.user_id as string;
    savedCounts.set(id, (savedCounts.get(id) ?? 0) + 1);
  }

  const users: AdminManagedUser[] = authList.users.map((user) => {
    const profile = profilesById.get(user.id);
    const role = rolesById.get(user.id) ?? null;
    const firstName = String(profile?.first_name ?? "").trim();
    const lastName = String(profile?.last_name ?? "").trim();
    const displayName =
      String(profile?.display_name ?? "").trim() ||
      [firstName, lastName].filter(Boolean).join(" ");
    const bannedUntil = (user as { banned_until?: string }).banned_until;
    const isBanned = Boolean(
      bannedUntil && new Date(bannedUntil).getTime() > Date.now()
    );

    return {
      userId: user.id,
      email: user.email ?? String(profile?.email ?? ""),
      displayName: displayName || (user.email ?? "").split("@")[0] || "—",
      firstName,
      lastName,
      role: (role as AdminManagedUser["role"]) ?? null,
      status: isBanned ? "deactivated" : "active",
      emailConfirmed: Boolean(user.email_confirmed_at),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      savedSpecialistsCount: savedCounts.get(user.id) ?? 0,
    };
  });

  users.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ ok: true, users });
}

interface PatchBody {
  userId?: string;
  action?: "deactivate" | "reactivate" | "update";
  firstName?: string;
  lastName?: string;
}

/** Protect admins from being managed through this endpoint. */
async function isTargetAdmin(
  caller: AdminCaller,
  userId: string
): Promise<boolean> {
  const { data } = await caller.client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data && isAdminAppRole(String(data.role)));
}

export async function PATCH(request: Request) {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireAdminCaller();
  if (!caller) return forbidden();

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim();
  if (!userId || !body.action) {
    return NextResponse.json(
      { ok: false, message: "userId and action are required." },
      { status: 400 }
    );
  }

  if (userId === caller.userId || (await isTargetAdmin(caller, userId))) {
    return NextResponse.json(
      { ok: false, message: "Admin accounts cannot be managed here." },
      { status: 400 }
    );
  }

  if (body.action === "deactivate" || body.action === "reactivate") {
    const { error } = await service.auth.admin.updateUserById(userId, {
      ban_duration:
        body.action === "deactivate"
          ? DEACTIVATE_BAN_DURATION
          : LIFT_BAN_DURATION,
    });
    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update") {
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const { error } = await service
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, message: "Unknown action." },
    { status: 400 }
  );
}

interface DeleteBody {
  userId?: string;
}

export async function DELETE(request: Request) {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireAdminCaller();
  if (!caller) return forbidden();

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json(
      { ok: false, message: "userId is required." },
      { status: 400 }
    );
  }

  if (userId === caller.userId || (await isTargetAdmin(caller, userId))) {
    return NextResponse.json(
      { ok: false, message: "Admin accounts cannot be deleted here." },
      { status: 400 }
    );
  }

  /* FK cascades remove profiles, user_roles, saved_trainers; applications
   * and specialist_profiles keep rows with user_id set null (catalog safety). */
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
