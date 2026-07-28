import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";
import { isAdminAppRole } from "@/types/auth-roles";

/**
 * Permanently remove a specialist from the marketplace.
 * Service-role backed; requires signed-in owner_admin.
 */

function serviceClient() {
  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerAdminCaller() {
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
  return { userId: user.id };
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

interface DeleteBody {
  specialistId?: string;
  /** Also delete the linked Auth user (specialist login). Default true. */
  deleteAuthUser?: boolean;
}

export async function DELETE(request: Request) {
  const service = serviceClient();
  if (!service) return unavailable();
  const caller = await requireOwnerAdminCaller();
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

  const specialistId = body.specialistId?.trim();
  if (!specialistId) {
    return NextResponse.json(
      { ok: false, message: "specialistId is required." },
      { status: 400 }
    );
  }

  const deleteAuthUser = body.deleteAuthUser !== false;

  const { data: profile, error: profileReadError } = await service
    .from("specialist_profiles")
    .select("id, user_id, display_name")
    .eq("id", specialistId)
    .maybeSingle();

  if (profileReadError) {
    return NextResponse.json(
      { ok: false, message: profileReadError.message },
      { status: 502 }
    );
  }

  /* Still purge related rows even if profile row is already gone */
  const userId =
    profile?.user_id && typeof profile.user_id === "string"
      ? profile.user_id
      : null;

  if (userId && userId === caller.userId) {
    return NextResponse.json(
      { ok: false, message: "You cannot delete your own admin-linked specialist." },
      { status: 400 }
    );
  }

  if (userId) {
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (roleRow && isAdminAppRole(String(roleRow.role))) {
      return NextResponse.json(
        { ok: false, message: "Admin accounts cannot be deleted here." },
        { status: 400 }
      );
    }
  }

  const cleanupErrors: string[] = [];

  const savedRes = await service
    .from("saved_trainers")
    .delete()
    .eq("specialist_id", specialistId);
  if (savedRes.error) cleanupErrors.push(`saved_trainers: ${savedRes.error.message}`);

  const engagementRes = await service
    .from("specialist_engagement_events")
    .delete()
    .eq("specialist_id", specialistId);
  if (engagementRes.error) {
    /* Table may be missing in older envs */
    console.warn(
      "[SMOAC admin] engagement purge:",
      engagementRes.error.message
    );
  }

  const reviewsRes = await service
    .from("specialist_reviews")
    .delete()
    .eq("specialist_id", specialistId);
  if (reviewsRes.error) {
    console.warn("[SMOAC admin] reviews purge:", reviewsRes.error.message);
  }

  /* Soft-archive application rows that share this id */
  const appRes = await service
    .from("specialist_applications")
    .update({
      profile_status: "ARCHIVED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", specialistId);
  if (appRes.error) {
    console.warn("[SMOAC admin] application archive:", appRes.error.message);
  }

  const profileDel = await service
    .from("specialist_profiles")
    .delete()
    .eq("id", specialistId);
  if (profileDel.error) {
    return NextResponse.json(
      {
        ok: false,
        message: profileDel.error.message,
        cleanupErrors,
      },
      { status: 502 }
    );
  }

  let authDeleted = false;
  if (deleteAuthUser && userId) {
    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) {
      cleanupErrors.push(`auth.users: ${authError.message}`);
    } else {
      authDeleted = true;
    }
  }

  return NextResponse.json({
    ok: true,
    specialistId,
    authDeleted,
    cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
  });
}
