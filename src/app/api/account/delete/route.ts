import { NextResponse } from "next/server";
import { purgeSpecialistAccount } from "@/lib/admin/purge-specialist-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminAppRole } from "@/types/auth-roles";

export const runtime = "nodejs";

/**
 * Signed-in user deletes their own account.
 * Specialists use the same catalog purge as admin removal, then the auth user.
 * Clients use the auth delete that cascades profile, role, and saves.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  if (!supabase || !service) {
    return NextResponse.json(
      { ok: false, message: "Account deletion is not available." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to delete your account." },
      { status: 401 }
    );
  }

  const { data: roleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = String(roleRow?.role ?? "");
  if (isAdminAppRole(role)) {
    return NextResponse.json(
      { ok: false, message: "Admin accounts cannot be deleted here." },
      { status: 400 }
    );
  }

  if (role === "specialist") {
    const [{ data: profile }, { data: application }] = await Promise.all([
      service
        .from("specialist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      service
        .from("specialist_applications")
        .select("id, email")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const specialistId = String(profile?.id ?? application?.id ?? "").trim();
    if (specialistId) {
      const purged = await purgeSpecialistAccount(service, {
        specialistId,
        userId: user.id,
        email: user.email ?? application?.email ?? null,
        callerUserId: user.id,
        selfService: true,
      });
      if (!purged.ok) {
        return NextResponse.json(
          { ok: false, message: purged.message },
          { status: 400 }
        );
      }
      if (purged.authDeleted) return NextResponse.json({ ok: true });
    }
  }

  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
